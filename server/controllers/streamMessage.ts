import { Request, Response } from "express";
import { ENV } from "../config/env";
import { createMessage } from "../db/queries/messages";
import { updateMessageEmbedding } from "../db/queries/messages";
import { createNewChat } from "../services/user/chatServices";
import { extractUrls, fetchSourceMeta } from "../utils/helper";
import { InsertMessage } from "../db/schema";

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export const addMessageAndStreamResponse = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  // eslint-disable-next-line no-console
  console.log("[SSE] stream start");
  const { query, chat_id } = (req.body || {}) as {
    query?: string;
    chat_id?: string;
  };

  if (!query) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required field: query" });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Content-Encoding", "identity");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setTimeout(0);
  // @ts-ignore
  req.setTimeout?.(0);
  res.flushHeaders?.();
  // Reduce buffering delays on small writes
  try {
    res.socket?.setNoDelay(true);
  } catch {}
  try {
    res.write(":ok\n\n");
  } catch {}

  let ended = false;
  let aiText = "";
  const heartbeat = setInterval(() => {
    if (!ended) {
      try {
        res.write(`:ping ${Date.now()}\n\n`);
      } catch {}
    }
  }, 15000);

  // Helper to emit SSE events
  const writeEvent = (data: unknown) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {}
  };

  // Ensure chat exists synchronously (so we can persist reliably and inform client)
  let chatIdToUse = chat_id;
  try {
    if (!chatIdToUse) {
      const created = await createNewChat({
        userId,
        title: "AI Chat",
      } as any);
      if ((created as any)?.data?.id) {
        chatIdToUse = (created as any).data.id as string;
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[SSE] failed to ensure chat:", e);
  }

  // Persist user message without blocking the stream
  if (chatIdToUse) {
    (async () => {
      try {
        const userMsg: InsertMessage = {
          chatId: chatIdToUse as string,
          userId,
          content: query,
          isAi: false,
        } as InsertMessage;
        const created = await createMessage(userMsg);
        // Generate and persist embedding in background for the user message
        try {
          const { embeddingService } = await import(
            "../services/ai/embeddingService"
          );
          const embedding = await embeddingService.generateEmbedding(query);
          if (created?.id) {
            await updateMessageEmbedding(
              created.id as string,
              userId,
              embedding
            );
          }
        } catch (embedErr) {
          // eslint-disable-next-line no-console
          console.error(
            "[SSE] failed to generate/store user embedding:",
            embedErr
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[SSE] failed to persist user message:", e);
      }
    })();
  }

  // Bridge to Python HTTP streaming endpoint
  (async () => {
    const controller = new AbortController();
    res.on("close", () => {
      try {
        controller.abort();
      } catch {}
      if (!ended) {
        ended = true;
        res.end();
      }
      clearInterval(heartbeat);
    });

    try {
      const base = (ENV.AI_MICROSERVICE_URL || "").replace(/\/+$/, "");
      const url = `${base}/agent/stream`;
      // eslint-disable-next-line no-console
      console.log(`[HTTP] upstream connect: ${url}`);
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          user_id: userId,
          chat_id: chatIdToUse || "",
        }),
        signal: controller.signal as any,
      } as any);

      if (!resp.ok || !resp.body) {
        writeEvent({
          error: `Upstream HTTP ${resp.status} ${resp.statusText}`,
        });
        ended = true;
        clearInterval(heartbeat);
        return res.end();
      }

      const reader = (resp.body as any).getReader?.();
      const decoder = new TextDecoder();
      let buffer = "";
      let stopEarly = false;
      let sawEndEvent = false as boolean;
      let endEventObject: any = null as any;
      let chartEvents: Array<any> = [];
      let sourcesCollected: Array<{
        title: string;
        url: string;
        ogImageUrl: string | null;
      }> | null = null;
      // Accumulate SSE data: support multi-line 'data:' per event until a blank line
      let sseDataBuffer = "";
      if (!reader) {
        writeEvent({
          event: "error",
          message: "Upstream stream reader unavailable",
        });
        ended = true;
        clearInterval(heartbeat);
        return res.end();
      }
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const rawLine = buffer.slice(0, idx);
          // Remove trailing CR if present; do not trim leading spaces for SSE parsing
          const line = rawLine.replace(/\r$/, "");
          buffer = buffer.slice(idx + 1);

          // Comment line in SSE
          if (line.startsWith(":")) {
            continue;
          }

          // SSE data lines: accumulate value until blank line
          if (line.startsWith("data:")) {
            const dataPart = line.slice(5).replace(/^\s/, "");
            sseDataBuffer += dataPart + "\n";
            continue;
          }

          // Blank line signifies end of an SSE event: parse accumulated data
          if (line.trim() === "") {
            const payload = sseDataBuffer.trim();
            sseDataBuffer = "";
            if (!payload) {
              continue;
            }
            try {
              const obj = JSON.parse(payload);
              if (obj && typeof obj === "object") {
                if (obj.event === "process") {
                  writeEvent(obj);
                } else if (obj.event === "token") {
                  writeEvent(obj);
                  if (typeof obj.text === "string") {
                    aiText += obj.text;
                  }
                } else if (obj.event === "chart_data") {
                  // Collect chart data while also passing through to client
                  try {
                    if (obj.chart) {
                      chartEvents.push(obj.chart);
                    } else if (obj.data && obj.type) {
                      // Fallback: some producers might send the chart directly
                      chartEvents.push({ ...obj });
                    }
                  } catch {}
                  writeEvent(obj);
                } else if (obj.event === "end") {
                  sawEndEvent = true;
                  endEventObject = obj;
                  try {
                    controller.abort();
                  } catch {}
                  stopEarly = true;
                  break;
                } else {
                  writeEvent(obj);
                }
              }
            } catch (_e) {
              // ignore malformed event
            }
            continue;
          }

          // Fallback: if producer sends raw JSON per line (non-SSE strict), try to parse
          const maybe = line.trim();
          if (!maybe) continue;
          try {
            const obj = JSON.parse(maybe);
            if (obj && typeof obj === "object") {
              if (obj.event === "process") {
                writeEvent(obj);
              } else if (obj.event === "token") {
                writeEvent(obj);
                if (typeof obj.text === "string") {
                  aiText += obj.text;
                }
              } else if (obj.event === "chart_data") {
                try {
                  if (obj.chart) {
                    chartEvents.push(obj.chart);
                  } else if (obj.data && obj.type) {
                    chartEvents.push({ ...obj });
                  }
                } catch {}
                writeEvent(obj);
              } else if (obj.event === "end") {
                sawEndEvent = true;
                endEventObject = obj;
                try {
                  controller.abort();
                } catch {}
                stopEarly = true;
                break;
              } else {
                writeEvent(obj);
              }
            }
          } catch (_e) {
            // ignore non-JSON lines
          }
        }
        if (stopEarly) break;
      }
      // Before ending: if there are URLs in the aggregated AI text, emit a sources event
      try {
        if (aiText && aiText.trim()) {
          const urls = extractUrls(aiText);
          if (urls && urls.length) {
            const metas = await Promise.all(
              urls.map(async (u) => await fetchSourceMeta(u))
            );
            const sources = metas.map((m) => ({
              title: m.title,
              url: m.url,
              ogImageUrl: m.ogImageUrl,
            }));
            writeEvent({ event: "sources", data: sources });
            sourcesCollected = sources;
          }
        }
      } catch (_e) {
        // ignore sources errors; proceed to end
      }

      // Finally, send the end event (use upstream one if present)
      if (!ended) {
        try {
          writeEvent(endEventObject || { event: "end" });
        } catch {}
        ended = true;
        res.end();
      }
      clearInterval(heartbeat);
      if (chatIdToUse && (aiText || chartEvents.length)) {
        (async () => {
          try {
            const aiMsg: InsertMessage = {
              chatId: chatIdToUse as string,
              userId,
              content: aiText || "",
              isAi: true,
              aiTokensUsed: null as any,
              aiCost: null as any,
              aiChartData: (chartEvents && chartEvents.length
                ? (chartEvents as any)
                : (null as any)) as any,
              aiResponseSources: sourcesCollected as any,
            } as InsertMessage;
            const createdAi = await createMessage(aiMsg);
            // Generate and persist embedding in background for the AI message
            try {
              const { embeddingService } = await import(
                "../services/ai/embeddingService"
              );
              if (aiText && aiText.trim() && createdAi?.id) {
                const embedding = await embeddingService.generateEmbedding(
                  aiText
                );
                await updateMessageEmbedding(
                  createdAi.id as string,
                  userId,
                  embedding
                );
              }
            } catch (embedErr) {
              // eslint-disable-next-line no-console
              console.error(
                "[SSE] failed to generate/store AI embedding:",
                embedErr
              );
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("[SSE] failed to persist AI message:", e);
          }
        })();
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("[HTTP] upstream error:", error);
      if (!ended) {
        writeEvent({
          event: "error",
          message: String(error?.message || error),
        });
        ended = true;
        res.end();
      }
      clearInterval(heartbeat);
    }
  })();
};

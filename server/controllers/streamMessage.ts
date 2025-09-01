import { Request, Response } from "express";
// Switching to HTTP streaming from Python microservice
import { ENV } from "../config/env";
import { createMessage } from "../db/queries/messages";
import { createNewChat } from "../services/user/chatServices";
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
          isWhatsapp: false,
          isTelegram: false,
        } as InsertMessage;
        await createMessage(userMsg);
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
          const line = rawLine.trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            // Support upstream SSE lines that begin with 'data: '
            const jsonString = line.startsWith("data: ")
              ? line.slice(6).trim()
              : line;
            const obj = JSON.parse(jsonString);
            if (obj && typeof obj === "object") {
              // Pass-through upstream events as-is
              if (obj.event === "process") {
                writeEvent(obj);
              } else if (obj.event === "token") {
                writeEvent(obj);
                if (typeof obj.text === "string") {
                  aiText += obj.text;
                }
              } else if (obj.event === "end") {
                writeEvent(obj);
                try {
                  controller.abort();
                } catch {}
                stopEarly = true;
                break;
              } else {
                // Unknown event; forward for visibility
                writeEvent(obj);
              }
            }
          } catch (_e) {
            // ignore bad line
          }
        }
        if (stopEarly) break;
      }
      // Do not emit our own end event; rely on upstream 'event:end'
      if (!ended) {
        ended = true;
        res.end();
      }
      clearInterval(heartbeat);
      if (chatIdToUse && aiText) {
        try {
          const aiMsg: InsertMessage = {
            chatId: chatIdToUse as string,
            userId,
            content: aiText,
            isAi: true,
            isWhatsapp: false,
            isTelegram: false,
            aiTokensUsed: null as any,
            aiCost: null as any,
            aiChartData: null as any,
          } as InsertMessage;
          await createMessage(aiMsg);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[SSE] failed to persist AI message:", e);
        }
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

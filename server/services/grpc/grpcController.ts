import { Request, Response } from "express";
import { messageStream as startMessageStream } from "./grpcClient";
import { createMessage } from "../../db/queries/messages";
import { InsertMessage } from "../../db/schema";

export const messageStream = (req: Request, res: Response) => {
  const { query, user_id, chat_id } = req.body || {};

  if (!query || !user_id || !chat_id) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: query, user_id, chat_id",
    });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Content-Encoding", "identity");
  res.setHeader("Transfer-Encoding", "chunked");
  // Prevent server timeouts
  res.setTimeout(0);
  // @ts-ignore optional in some setups
  req.setTimeout?.(0);
  res.flushHeaders?.();
  try {
    res.socket?.setNoDelay(true);
  } catch {}
  // Initial comment to nudge proxies/clients to keep the stream open
  try {
    res.write(":ok\n\n");
  } catch {}

  let call: any;
  try {
    call = startMessageStream({ query, user_id, chat_id });
  } catch (e: any) {
    return res
      .status(500)
      .json({ success: false, error: String(e?.message || e) });
  }

  let ended = false;
  let aiText = "";
  const heartbeat = setInterval(() => {
    if (!ended) {
      try {
        res.write(`:ping ${Date.now()}\n\n`);
      } catch {}
    }
  }, 15000);

  const writeEvent = (data: unknown) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (_err) {
      // ignore write after end
    }
  };

  call.on("metadata", (md: any) => {
    // eslint-disable-next-line no-console
    console.log("[gRPC] metadata:", md);
  });

  call.on("data", (chunk: { text?: string; end?: boolean; index?: number }) => {
    // eslint-disable-next-line no-console
    console.log("[gRPC] data:", chunk);
    writeEvent({
      text: chunk.text || "",
      end: !!chunk.end,
      index: chunk.index ?? 0,
    });
    if (chunk?.text) {
      aiText += chunk.text;
    }
  });

  call.on("status", (status: any) => {
    // eslint-disable-next-line no-console
    console.log("[gRPC] status:", status);
  });

  call.on("end", () => {
    if (!ended) {
      writeEvent({ end: true });
      ended = true;
      res.end();
    }
    // Persist AI message in background
    (async () => {
      try {
        if (aiText && chat_id && user_id) {
          const aiMsg: InsertMessage = {
            chatId: chat_id,
            userId: user_id,
            content: aiText,
            isAi: true,
            isWhatsapp: false,
            isTelegram: false,
            aiTokensUsed: null as any,
            aiCost: null as any,
            aiChartData: null as any,
          } as InsertMessage;
          await createMessage(aiMsg);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[gRPC] failed to persist AI message (legacy route):", e);
      }
    })();
  });

  call.on("error", (error: any) => {
    // eslint-disable-next-line no-console
    console.error("[gRPC] error:", error);
    if (!ended) {
      writeEvent({ error: String(error?.message || error) });
      ended = true;
      res.end();
    }
  });

  res.on("close", () => {
    try {
      call.cancel?.();
    } catch (_err) {
      // ignore
    }
    if (!ended) {
      ended = true;
      res.end();
    }
    clearInterval(heartbeat);
  });

  // Persist user message in background (do not block stream)
  (async () => {
    try {
      const userMsg: InsertMessage = {
        chatId: chat_id,
        userId: user_id,
        content: query,
        isAi: false,
        isWhatsapp: false,
        isTelegram: false,
      } as InsertMessage;
      await createMessage(userMsg);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[gRPC] failed to persist user message (legacy route):", e);
    }
  })();
};

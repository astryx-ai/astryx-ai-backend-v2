import { Request, Response } from "express";
import { messageStream as startMessageStream } from "../services/grpc/grpcClient";
import { createMessage } from "../db/queries/messages";
import { createNewChat } from "../services/user/chatServices";
import { InsertMessage } from "../db/schema";

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export const messageStreamAuthorized = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  // eslint-disable-next-line no-console
  console.log("[SSE] /grpc/messages hit");
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
    console.error("[gRPC] failed to ensure chat:", e);
  }

  // Inform client which chat_id is used
  try {
    if (chatIdToUse) {
      res.write(
        `data: ${JSON.stringify({ meta: { chat_id: chatIdToUse } })}\n\n`
      );
    }
  } catch {}

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
        console.error("[gRPC] failed to persist user message:", e);
      }
    })();
  }

  let call: any;
  try {
    call = startMessageStream({
      query,
      user_id: userId,
      chat_id: chatIdToUse || "",
    });
  } catch (e: any) {
    try {
      writeEvent({ error: String(e?.message || e) });
    } catch {}
    ended = true;
    clearInterval(heartbeat);
    return res.end();
  }

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
    clearInterval(heartbeat);
    if (chatIdToUse && aiText) {
      (async () => {
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
          console.error("[gRPC] failed to persist AI message:", e);
        }
      })();
    }
  });

  call.on("error", (error: any) => {
    // eslint-disable-next-line no-console
    console.error("[gRPC] error:", error);
    if (!ended) {
      writeEvent({ error: String(error?.message || error) });
      ended = true;
      res.end();
    }
    clearInterval(heartbeat);
  });

  res.on("close", () => {
    try {
      call.cancel?.();
    } catch {}
    if (!ended) {
      ended = true;
      res.end();
    }
    clearInterval(heartbeat);
  });
};

import express from "express";
import * as messageController from "../controllers/message";

const router = express.Router();

// REST message routes (preserve existing paths)
router.get(
  "/chats/:chatId/messages",
  messageController.getChatMessagesController
);

router.post(
  "/chats/:chatId/messages",
  messageController.addMessageController as unknown as express.RequestHandler
);

router.put(
  "/messages/:messageId",
  messageController.updateMessageController as unknown as express.RequestHandler
);

// Streaming route under /user/messages/stream
router.post(
  "/messages/stream",
  messageController.addMessageAndStreamResponse as unknown as express.RequestHandler
);

export default router;

import express from "express";
import * as chatController from "../controllers/chat";

const router = express.Router();

router.get("/", chatController.getUserChatsController);
router.get("/:chatId", chatController.getChatByIdController);
router.post(
  "/",
  chatController.createChatController as unknown as express.RequestHandler
);
router.put(
  "/:chatId",
  chatController.updateChatController as unknown as express.RequestHandler
);
router.delete("/:chatId", chatController.deleteChatController);

export default router;

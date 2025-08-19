import express from "express";
const router = express.Router();

import * as userController from "../controllers/user";

// User profile routes
router.get("/me", userController.getUserProfileController);
router.put("/me", userController.updateUserDataController);

// Phone verification routes
router.post(
  "/send-phone-verification",
  userController.sendPhoneVerificationController
);
router.post("/verify-phone", userController.verifyPhoneController);

// Cloud Task routes

// Chat routes
router.get("/chats", userController.getUserChatsController);
router.get("/chats/:chatId", userController.getChatByIdController);
router.post("/chats", userController.createChatController);
router.put("/chats/:chatId", userController.updateChatController);
router.delete("/chats/:chatId", userController.deleteChatController);

// Message routes
router.get("/chats/:chatId/messages", userController.getChatMessagesController);
router.post("/chats/:chatId/messages", userController.addMessageController);
router.put("/messages/:messageId", userController.updateMessageController);

export default router;

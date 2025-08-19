import express from "express";
import * as telegramController from "../controllers/telegram";

const router = express.Router();

// Webhook routes for Telegram Bot API
router.post("/webhook", telegramController.handleIncomingMessage);
router.get("/webhook", telegramController.verifyWebhook);

// Test route for sending messages (optional, for testing)
router.post("/send-test", telegramController.sendTestMessage);

export default router;

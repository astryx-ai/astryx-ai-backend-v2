import express from "express";
import * as whatsappController from "../controllers/whatsapp";

const router = express.Router();

// Webhook routes for Twilio
router.post("/webhook", whatsappController.handleIncomingMessage);
router.get("/webhook", whatsappController.verifyWebhook);

// Test route for sending messages (optional, for testing)
router.post("/send-test", whatsappController.sendTestMessage);

export default router;

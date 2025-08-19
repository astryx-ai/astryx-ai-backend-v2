import { Request, Response } from "express";
import { TwilioWhatsAppService } from "../services/whatsapp";
import { WhatsAppOnboardingFlowService } from "../services/whatsapp/onboardingFlowService";
import { WhatsAppMessageTemplates } from "../services/whatsapp/messageTemplates";
import * as ResponseHelper from "../utils/responseHelper";

/**
 * Handle incoming WhatsApp messages from Twilio webhook
 */
export const handleIncomingMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Received WhatsApp webhook:", req.body);

    // Extract message data from Twilio webhook
    const {
      Body: messageBody,
      From: fromNumber,
      To: toNumber,
      MessageSid: messageSid,
      ProfileName: profileName,
    } = req.body;

    // Validate required fields
    if (!messageBody || !fromNumber) {
      ResponseHelper.badRequest(
        res,
        "Missing required message data",
        "Missing required message data"
      );
      return;
    }

    console.log(`WhatsApp message received from ${fromNumber}: ${messageBody}`);
    console.log(`Profile name: ${profileName || "Not provided"}`);

    // Extract clean phone number for processing
    const cleanPhoneNumber = fromNumber.replace("whatsapp:", "");

    // Log the interaction
    const messageData = {
      messageSid,
      from: fromNumber,
      to: toNumber,
      body: messageBody,
      profileName: profileName || "Unknown",
      timestamp: new Date().toISOString(),
    };
    console.log("Message data logged:", messageData);

    // Handle special commands
    const lowerMessage = messageBody.toLowerCase().trim();
    if (lowerMessage === "start" || lowerMessage === "restart") {
      await WhatsAppOnboardingFlowService.handleRestart(
        fromNumber,
        cleanPhoneNumber,
        profileName
      );
    } else if (lowerMessage === "help") {
      await TwilioWhatsAppService.sendMessage({
        body: WhatsAppMessageTemplates.getHelpMessage(),
        to: fromNumber,
      });
    } else {
      // Process message through onboarding flow with profile name
      await WhatsAppOnboardingFlowService.handleMessage(
        fromNumber,
        messageBody,
        profileName
      );
    }

    // Respond to Twilio webhook with success
    ResponseHelper.success(
      res,
      { received: true, messageSid },
      "Message received and processed"
    );
  } catch (error) {
    console.error("Error processing WhatsApp message:", error);

    // Try to send error message to user
    try {
      if (req.body?.From) {
        await TwilioWhatsAppService.sendMessage({
          body: WhatsAppMessageTemplates.getProcessingErrorMessage(),
          to: req.body.From,
        });
      }
    } catch (sendError) {
      console.error("Error sending error message:", sendError);
    }

    ResponseHelper.error(res, error, "Failed to process WhatsApp message");
  }
};

/**
 * Handle webhook verification (GET request from Twilio)
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  console.log("WhatsApp webhook verification request received");
  res.status(200).send("WhatsApp webhook verified");
};

/**
 * Send a test WhatsApp message (for testing purposes)
 */
export const sendTestMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      ResponseHelper.badRequest(
        res,
        "Phone number and message are required",
        "Phone number and message are required"
      );
      return;
    }

    const result = await TwilioWhatsAppService.sendMessage({
      body: message,
      to: phoneNumber,
    });

    ResponseHelper.success(res, result, "Test message sent successfully");
  } catch (error) {
    console.error("Error sending test message:", error);
    ResponseHelper.error(res, error, "Failed to send test message");
  }
};

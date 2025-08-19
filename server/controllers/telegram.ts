import { Request, Response } from "express";
import { TelegramBotService } from "../services/telegram";
import { TelegramOnboardingFlowService } from "../services/telegram/onboardingFlowService";
import { TelegramMessageTemplates } from "../services/telegram/messageTemplates";
import * as ResponseHelper from "../utils/responseHelper";

/**
 * Handle incoming Telegram messages from Bot API webhook
 */
export const handleIncomingMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Received Telegram webhook:", req.body);

    // Extract message data from Telegram Bot API webhook
    const update = req.body;

    // Handle regular messages
    if (update.message) {
      const {
        text: messageText,
        from: fromUser,
        chat: chatInfo,
        message_id: messageId,
      } = update.message;

      // Validate required fields
      if (!messageText || !fromUser || !chatInfo) {
        ResponseHelper.badRequest(
          res,
          "Missing required message data",
          "Missing required message data"
        );
        return;
      }

      console.log(
        `Telegram message received from ${fromUser.id}: ${messageText}`
      );
      console.log(
        `User name: ${fromUser.first_name || "Not provided"} ${
          fromUser.last_name || ""
        }`
      );
      console.log(`Username: ${fromUser.username || "Not provided"}`);

      const userId = fromUser.id.toString();
      const userName =
        `${fromUser.first_name || ""} ${fromUser.last_name || ""}`.trim() ||
        fromUser.username ||
        "User";

      // Log the interaction
      const messageData = {
        messageId,
        userId,
        chatId: chatInfo.id,
        text: messageText,
        userName,
        timestamp: new Date().toISOString(),
      };
      console.log("Message data logged:", messageData);

      // Handle special commands
      const lowerMessage = messageText.toLowerCase().trim();
      if (lowerMessage === "/start" || lowerMessage === "start") {
        await TelegramOnboardingFlowService.handleStart(
          chatInfo.id,
          userId,
          userName
        );
      } else if (lowerMessage === "/restart" || lowerMessage === "restart") {
        await TelegramOnboardingFlowService.handleRestart(
          chatInfo.id,
          userId,
          userName
        );
      } else if (lowerMessage === "/help" || lowerMessage === "help") {
        await TelegramBotService.sendMessage({
          text: TelegramMessageTemplates.getHelpMessage(),
          chat_id: chatInfo.id,
        });
      } else {
        // Process message through onboarding flow
        await TelegramOnboardingFlowService.handleMessage(
          chatInfo.id,
          userId,
          messageText,
          userName
        );
      }
    }

    // Handle callback queries (inline keyboard button presses)
    else if (update.callback_query) {
      const {
        data: callbackData,
        from: fromUser,
        message: callbackMessage,
      } = update.callback_query;

      if (!callbackData || !fromUser || !callbackMessage) {
        ResponseHelper.badRequest(
          res,
          "Missing required callback data",
          "Missing required callback data"
        );
        return;
      }

      console.log(
        `Telegram callback received from ${fromUser.id}: ${callbackData}`
      );

      const userId = fromUser.id.toString();
      const userName =
        `${fromUser.first_name || ""} ${fromUser.last_name || ""}`.trim() ||
        fromUser.username ||
        "User";

      // Answer the callback query to remove loading state
      await TelegramBotService.answerCallbackQuery(update.callback_query.id);

      // Process callback data through onboarding flow
      await TelegramOnboardingFlowService.handleMessage(
        callbackMessage.chat.id,
        userId,
        callbackData,
        userName
      );
    }

    // Respond to Telegram webhook with success
    ResponseHelper.success(
      res,
      { received: true },
      "Message received and processed"
    );
  } catch (error) {
    console.error("Error processing Telegram message:", error);

    // Try to send error message to user
    try {
      if (req.body?.message?.chat?.id) {
        await TelegramBotService.sendMessage({
          text: TelegramMessageTemplates.getProcessingErrorMessage(),
          chat_id: req.body.message.chat.id,
        });
      } else if (req.body?.callback_query?.message?.chat?.id) {
        await TelegramBotService.sendMessage({
          text: TelegramMessageTemplates.getProcessingErrorMessage(),
          chat_id: req.body.callback_query.message.chat.id,
        });
      }
    } catch (sendError) {
      console.error("Error sending error message:", sendError);
    }

    ResponseHelper.error(res, error, "Failed to process Telegram message");
  }
};

/**
 * Handle webhook verification (GET request from Telegram)
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  console.log("Telegram webhook verification request received");
  res.status(200).send("Telegram webhook verified");
};

/**
 * Send a test Telegram message (for testing purposes)
 */
export const sendTestMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      ResponseHelper.badRequest(
        res,
        "Chat ID and message are required",
        "Chat ID and message are required"
      );
      return;
    }

    const result = await TelegramBotService.sendMessage({
      text: message,
      chat_id: chatId,
    });

    ResponseHelper.success(res, result, "Test message sent successfully");
  } catch (error) {
    console.error("Error sending test message:", error);
    ResponseHelper.error(res, error, "Failed to send test message");
  }
};

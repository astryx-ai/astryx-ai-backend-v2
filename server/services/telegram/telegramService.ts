import axios from "axios";
import { ENV } from "../../config/env";

export interface TelegramMessage {
  text?: string;
  chat_id: number | string;
  reply_markup?: TelegramInlineKeyboard | TelegramReplyKeyboard;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramReplyKeyboard {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramKeyboardButton {
  text: string;
}

export class TelegramBotService {
  private static readonly BOT_TOKEN = ENV.TELEGRAM_BOT_TOKEN;
  private static readonly API_BASE_URL = `https://api.telegram.org/bot${TelegramBotService.BOT_TOKEN}`;

  /**
   * Send a message using Telegram Bot API
   */
  static async sendMessage(message: TelegramMessage): Promise<any> {
    try {
      const messageData: any = {
        chat_id: message.chat_id,
        text: message.text,
      };

      if (message.reply_markup) {
        messageData.reply_markup = message.reply_markup;
      }

      if (message.parse_mode) {
        messageData.parse_mode = message.parse_mode;
      }

      const response = await axios.post(
        `${this.API_BASE_URL}/sendMessage`,
        messageData
      );

      console.log(
        `Telegram message sent successfully. Message ID: ${response.data.result.message_id}`
      );
      return {
        success: true,
        messageId: response.data.result.message_id,
        data: response.data.result,
      };
    } catch (error) {
      console.error("Error sending Telegram message:", error);
      throw new Error(`Failed to send Telegram message: ${error}`);
    }
  }

  /**
   * Answer callback query (for inline keyboard button presses)
   */
  static async answerCallbackQuery(
    callbackQueryId: string,
    text?: string
  ): Promise<any> {
    try {
      const data: any = {
        callback_query_id: callbackQueryId,
      };

      if (text) {
        data.text = text;
      }

      const response = await axios.post(
        `${this.API_BASE_URL}/answerCallbackQuery`,
        data
      );

      console.log("Callback query answered successfully");
      return {
        success: true,
        data: response.data.result,
      };
    } catch (error) {
      console.error("Error answering callback query:", error);
      throw new Error(`Failed to answer callback query: ${error}`);
    }
  }

  /**
   * Set webhook URL for receiving updates
   */
  static async setWebhook(webhookUrl: string): Promise<any> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      });

      console.log("Webhook set successfully:", response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Error setting webhook:", error);
      throw new Error(`Failed to set webhook: ${error}`);
    }
  }

  /**
   * Get webhook info
   */
  static async getWebhookInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/getWebhookInfo`);

      console.log("Webhook info:", response.data);
      return {
        success: true,
        data: response.data.result,
      };
    } catch (error) {
      console.error("Error getting webhook info:", error);
      throw new Error(`Failed to get webhook info: ${error}`);
    }
  }

  /**
   * Delete webhook (for using long polling instead)
   */
  static async deleteWebhook(): Promise<any> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/deleteWebhook`);

      console.log("Webhook deleted successfully:", response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Error deleting webhook:", error);
      throw new Error(`Failed to delete webhook: ${error}`);
    }
  }
}

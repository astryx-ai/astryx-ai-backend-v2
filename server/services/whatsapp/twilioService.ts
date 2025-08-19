import twilio from "twilio";
import { ENV } from "../../config/env";

// Initialize Twilio client
const client = twilio(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);

export interface WhatsAppMessage {
  body: string;
  to: string;
  from?: string;
}

export class TwilioWhatsAppService {
  /**
   * Send a WhatsApp message using Twilio
   */
  static async sendMessage(message: WhatsAppMessage): Promise<any> {
    try {
      const response = await client.messages.create({
        body: message.body,
        from: message.from || ENV.TWILIO_FROM_WHATSAPP_NUMBER,
        to: message.to,
      });

      console.log(`WhatsApp message sent successfully. SID: ${response.sid}`);
      return {
        success: true,
        messageSid: response.sid,
        status: response.status,
      };
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw new Error(`Failed to send WhatsApp message: ${error}`);
    }
  }

  /**
   * Validate incoming webhook signature (optional security measure)
   */
  static validateWebhook(signature: string, url: string, params: any): boolean {
    try {
      return twilio.validateRequest(
        ENV.TWILIO_AUTH_TOKEN,
        signature,
        url,
        params
      );
    } catch (error) {
      console.error("Webhook validation error:", error);
      return false;
    }
  }
}

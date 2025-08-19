import { TwilioWhatsAppService } from "./twilioService";
import { AIChatService } from "../ai";
import { WhatsAppMessageTemplates } from "./messageTemplates";
import { WhatsAppOnboardingFlowService } from "./onboardingFlowService";
import { getUserByPhone } from "../../db/queries/users";
import { getWhatsAppChatByUserId, createChat } from "../../db/queries/chats";
import { createMessage } from "../../db/queries/messages";
import { InsertChat, InsertMessage } from "../../db/schema";

export class WhatsAppMessageHandlerService {
  // Greeting patterns to detect casual messages
  private static readonly GREETING_PATTERNS = [
    /^hi\b/i,
    /^hello\b/i,
    /^hey\b/i,
    /^how are you\b/i,
    /^how are you doing\b/i,
    /^how's it going\b/i,
    /^what's up\b/i,
    /^sup\b/i,
    /^good morning\b/i,
    /^good afternoon\b/i,
    /^good evening\b/i,
    /^gm\b/i,
    /^ga\b/i,
    /^ge\b/i,
    /^yo\b/i,
    /^wassup\b/i,
    /^whats up\b/i,
  ];

  // Maximum length for a message to be considered a casual greeting
  private static readonly MAX_GREETING_LENGTH = 50;

  /**
   * Handle message from existing user
   */
  static async handleExistingUserMessage(
    twilioPhoneNumber: string,
    message: string,
    user: any,
    profileName?: string
  ): Promise<void> {
    try {
      // Check for special commands first
      const lowerMessage = message.trim().toLowerCase();
      if (lowerMessage === "start" || lowerMessage === "restart") {
        // Extract clean phone number for onboarding flow
        const cleanPhoneNumber = twilioPhoneNumber.replace("whatsapp:", "");
        await WhatsAppOnboardingFlowService.handleRestart(
          twilioPhoneNumber,
          cleanPhoneNumber,
          profileName
        );
        return;
      }

      if (lowerMessage === "help") {
        await TwilioWhatsAppService.sendMessage({
          body: WhatsAppMessageTemplates.getHelpMessage(),
          to: twilioPhoneNumber,
        });
        return;
      }

      // Check if message is a casual greeting
      if (this.isCasualGreeting(message)) {
        await this.sendGreetingResponse(twilioPhoneNumber, user);
        return;
      }

      // Process the message with AI service and store in database
      await this.processWithAIServiceAndStore(
        twilioPhoneNumber,
        message,
        user,
        profileName
      );
    } catch (error) {
      console.error("Error handling existing user message:", error);
      await TwilioWhatsAppService.sendMessage({
        body: "Sorry, I'm experiencing technical difficulties. Please try again in a moment.",
        to: twilioPhoneNumber,
      });
    }
  }

  /**
   * Process WhatsApp message for a phone number (handles user lookup)
   */
  static async processWhatsAppMessage(
    phoneNumber: string,
    messageContent: string,
    profileName?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      // Find user by phone number
      const user = await getUserByPhone(phoneNumber);

      if (!user) {
        return {
          success: false,
          error: "User not found",
          message:
            "No user found with this phone number. Please register first.",
        };
      }

      // Process message using existing handler
      await this.handleExistingUserMessage(
        `whatsapp:${phoneNumber}`,
        messageContent,
        user,
        profileName
      );

      return {
        success: true,
        message: "Message processed successfully",
      };
    } catch (error) {
      console.error("Error processing WhatsApp message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to process your message. Please try again.",
      };
    }
  }

  /**
   * Check if message is a casual greeting
   */
  private static isCasualGreeting(message: string): boolean {
    const trimmedMessage = message.trim();

    // Check if message is short enough to be a casual greeting
    if (trimmedMessage.length > this.MAX_GREETING_LENGTH) {
      return false;
    }

    // Check if message matches any greeting pattern
    return this.GREETING_PATTERNS.some((pattern) =>
      pattern.test(trimmedMessage)
    );
  }

  /**
   * Send greeting response for casual messages
   */
  private static async sendGreetingResponse(
    twilioPhoneNumber: string,
    user: any
  ): Promise<void> {
    const userMetadata = user.rawUserMetaData as any;
    const displayName =
      userMetadata?.display_name ||
      userMetadata?.whatsapp_profile_name ||
      "there";

    const greetingResponse = `👋 Hello ${displayName}! 

Welcome back to Astryx! I'm here to help you with any trading or finance questions you might have.

Feel free to ask me about:
• Trading strategies
• Market analysis  
• Risk management
• Technical indicators
• Or any other finance topics

What would you like to know today?`;

    await TwilioWhatsAppService.sendMessage({
      body: greetingResponse,
      to: twilioPhoneNumber,
    });
  }

  /**
   * Process message with AI service and store in database
   */
  private static async processWithAIServiceAndStore(
    twilioPhoneNumber: string,
    message: string,
    user: any,
    profileName?: string
  ): Promise<void> {
    try {
      console.log(`Processing AI request for user ${user.id}: ${message}`);

      // 1. Find or create WhatsApp chat for this user
      let whatsappChat = await getWhatsAppChatByUserId(user.id);

      if (!whatsappChat) {
        // Create a new WhatsApp chat
        const chatTitle = profileName
          ? `WhatsApp Chat with ${profileName}`
          : `WhatsApp Chat - ${user.phone}`;

        const newChatData: InsertChat = {
          userId: user.id,
          title: chatTitle,
          isWhatsapp: true,
        };

        whatsappChat = await createChat(newChatData);
      }

      // 2. Get AI response
      const aiResult = await AIChatService.processUserQuery(
        user.id,
        message,
        user.chat_id
      );

      if (!aiResult.success) {
        // Send error message if AI service failed
        const errorMessage =
          aiResult.data?.response ||
          "Sorry, I couldn't process your request right now. Please try again later.";

        await TwilioWhatsAppService.sendMessage({
          body: errorMessage,
          to: twilioPhoneNumber,
        });

        console.error(`AI service error for user ${user.id}:`, aiResult.error);
        return;
      }

      // 3. Store user message in database
      const userMessageData: InsertMessage = {
        chatId: whatsappChat.id,
        userId: user.id,
        content: message,
        isAi: false,
        isWhatsapp: true,
      };

      await createMessage(userMessageData);

      // 4. Store AI response message in database
      const aiMessageData: InsertMessage = {
        chatId: whatsappChat.id,
        userId: user.id,
        content: aiResult.data?.response || "",
        isAi: true,
        isWhatsapp: true,
        aiTokensUsed: aiResult.data?.tokens_used || null,
        aiCost: aiResult.data?.cost ? aiResult.data.cost.toString() : null,
        aiChartData: aiResult.data?.chart_data || null,
      };

      await createMessage(aiMessageData);

      // 5. Send AI response to user
      await TwilioWhatsAppService.sendMessage({
        body: aiResult.data?.response || "",
        to: twilioPhoneNumber,
      });

      console.log(
        `AI response sent and stored successfully. Chat ID: ${whatsappChat.id}`
      );
    } catch (error) {
      console.error("Error processing with AI service and storing:", error);

      await TwilioWhatsAppService.sendMessage({
        body: "Sorry, I'm having trouble connecting to my AI service right now. Please try again in a few moments.",
        to: twilioPhoneNumber,
      });
    }
  }

  /**
   * Get WhatsApp chat history for a user
   */
  static async getWhatsAppChatHistory(phoneNumber: string) {
    try {
      const user = await getUserByPhone(phoneNumber);

      if (!user) {
        return {
          success: false,
          error: "User not found",
          data: null,
        };
      }

      const whatsappChat = await getWhatsAppChatByUserId(user.id);

      if (!whatsappChat) {
        return {
          success: true,
          data: {
            chat: null,
            messages: [],
          },
          message: "No WhatsApp chat found",
        };
      }

      // You can extend this to get messages using the existing getMessagesByChatId function
      return {
        success: true,
        data: {
          chat: whatsappChat,
          messages: [], // Will be populated when needed
        },
        message: "WhatsApp chat retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting WhatsApp chat history:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  /**
   * Get greeting patterns for testing/debugging
   */
  static getGreetingPatterns(): RegExp[] {
    return [...this.GREETING_PATTERNS];
  }

  /**
   * Test if a message would be considered a greeting
   */
  static testGreetingDetection(message: string): boolean {
    return this.isCasualGreeting(message);
  }
}

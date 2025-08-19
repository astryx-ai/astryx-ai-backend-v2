import { TelegramBotService } from "./telegramService";
import { TelegramMessageTemplates } from "./messageTemplates";
import { createTelegramChat, getTelegramChat } from "../user/chatServices";
import { addTelegramMessage } from "../user/messageServices";
import { telegramProcessingStateManager } from "./processingStateManager";

export class TelegramMessageHandlerService {
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
   * Handle messages from existing users who have completed onboarding
   */
  static async handleExistingUserMessage(
    chatId: number | string,
    message: string,
    user: any,
    userName?: string
  ): Promise<void> {
    try {
      console.log(
        `Processing message from existing user ${user.id}: ${message}`
      );

      const userId = user.id.toString();

      // Check if user should be completely ignored (in cooldown and message already sent)
      if (telegramProcessingStateManager.shouldIgnoreUser(userId)) {
        // Silently ignore the message - don't send any response
        return;
      }

      // Check if user is currently processing a message
      if (telegramProcessingStateManager.isUserProcessing(userId)) {
        await TelegramBotService.sendMessage({
          text: "🤖 I'm still processing your previous message. Please wait...",
          chat_id: chatId,
        });
        return;
      }

      // Check if user is in cooldown period
      if (telegramProcessingStateManager.isUserInCooldown(userId)) {
        // Send cooldown message only if not sent before
        if (
          !telegramProcessingStateManager.hasCooldownMessageBeenSent(userId)
        ) {
          const remainingTime =
            telegramProcessingStateManager.getRemainingCooldownTime(userId);
          await TelegramBotService.sendMessage({
            text: TelegramMessageTemplates.getCooldownMessage(remainingTime),
            chat_id: chatId,
          });
          // Mark that cooldown message has been sent
          telegramProcessingStateManager.setCooldownMessageSent(userId);
        }
        return;
      }

      // Check if message is a casual greeting
      if (this.isCasualGreeting(message)) {
        await this.sendGreetingResponse(chatId, user, userName);
        return;
      }

      // Start processing (this will prevent duplicate requests)
      const canProcess = telegramProcessingStateManager.startProcessing(
        userId,
        chatId,
        "ai_query"
      );

      if (!canProcess) {
        await TelegramBotService.sendMessage({
          text: "🤖 I'm currently busy processing another message. Please wait...",
          chat_id: chatId,
        });
        return;
      }

      // Send acknowledgment message
      await TelegramBotService.sendMessage({
        text: "🤖 Astryx AI is analyzing your query... please wait 🔍",
        chat_id: chatId,
      });

      try {
        // Get or create Telegram chat for this user
        const chatResult = await getTelegramChat(user.id);
        let telegramChat = chatResult.data;

        if (!telegramChat) {
          // Create new Telegram chat if it doesn't exist
          const createChatResult = await createTelegramChat(
            user.id,
            `Telegram Chat - ${userName || "User"}`
          );
          if (!createChatResult.data) {
            throw new Error("Failed to create Telegram chat");
          }
          telegramChat = createChatResult.data;
        }

        // Add user message and get AI response
        const messageResult = await addTelegramMessage(
          telegramChat.id,
          user.id,
          message,
          false // This is a user message, not AI
        );

        if (messageResult.data && messageResult.aiResult?.whatsappSummary) {
          // Send AI response
          await TelegramBotService.sendMessage({
            text: `🤖 *Astryx AI Response:*\n\n${messageResult.aiResult.whatsappSummary}`,
            chat_id: chatId,
            parse_mode: "Markdown",
          });
        } else {
          // AI service failed
          await TelegramBotService.sendMessage({
            text: "❌ Sorry, I'm currently experiencing technical difficulties. Please try again in a moment.",
            chat_id: chatId,
          });
        }
      } catch (aiError) {
        console.error("Error processing Telegram message:", aiError);
        await TelegramBotService.sendMessage({
          text: "❌ I encountered an error while processing your question. Please try again.",
          chat_id: chatId,
        });
      } finally {
        // Always end processing to start cooldown
        telegramProcessingStateManager.endProcessing(userId);
      }
    } catch (error) {
      console.error("Error handling existing user message:", error);

      // Make sure to end processing even if there's an error
      const userId = user?.id?.toString();
      if (userId) {
        telegramProcessingStateManager.endProcessing(userId);
      }

      await TelegramBotService.sendMessage({
        text: TelegramMessageTemplates.getProcessingErrorMessage(),
        chat_id: chatId,
      });
    }
  }

  /**
   * Handle welcome back message for returning users
   */
  static async handleWelcomeBack(
    chatId: number | string,
    user: any,
    userName?: string
  ): Promise<void> {
    try {
      await TelegramBotService.sendMessage({
        text: TelegramMessageTemplates.getUserAlreadyExistsMessage(),
        chat_id: chatId,
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Error sending welcome back message:", error);
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
    chatId: number | string,
    user: any,
    userName?: string
  ): Promise<void> {
    // Try to get display name from user metadata or fallback to userName
    const userMetadata = user.rawUserMetaData as any;
    const displayName =
      userMetadata?.display_name ||
      userMetadata?.telegram_username ||
      userName ||
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

    await TelegramBotService.sendMessage({
      text: greetingResponse,
      chat_id: chatId,
    });
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

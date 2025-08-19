import { TelegramBotService } from "./telegramService";
import {
  telegramOnboardingStateManager,
  OnboardingStep,
} from "./onboardingStateManager";
import { telegramProcessingStateManager } from "./processingStateManager";
import { checkUserExistsByTelegramUserIdWithEmail } from "../../db/queries/users";
import { emailOtpCache } from "../user/emailOtpService";
import {
  createTelegramUserWithSupabase,
  validateEmail,
} from "../user/supabaseUserService";
import { TelegramMessageTemplates } from "./messageTemplates";
import { TelegramMessageHandlerService } from "./messageHandlerService";
import { AIChatService } from "../ai/aiChatService";

export class TelegramOnboardingFlowService {
  /**
   * Handle incoming Telegram message and determine appropriate response
   */
  static async handleMessage(
    chatId: string,
    userId: string,
    message: string,
    userName?: string
  ): Promise<void> {
    try {
      // Check if user should be completely ignored (in cooldown and message already sent)
      if (telegramProcessingStateManager.shouldIgnoreUser(userId)) {
        // Silently ignore the message - don't send any response
        return;
      }

      // For Telegram, we use userId as the unique identifier
      // Check if user already exists by Telegram User ID
      const userCheck = await checkUserExistsByTelegramUserIdWithEmail(userId);

      if (userCheck.exists && userCheck.hasEmail) {
        // User exists and has email - delegate to message handler service
        await TelegramMessageHandlerService.handleExistingUserMessage(
          chatId,
          message,
          userCheck.user,
          userName
        );
        return;
      }

      // Check if user is in onboarding process
      const onboardingState = telegramOnboardingStateManager.getState(userId);

      if (onboardingState) {
        // User is in onboarding - handle based on current step
        await this.handleOnboardingStep(
          chatId,
          userId,
          message,
          onboardingState.currentStep
        );
      } else {
        // New user - start onboarding
        await this.startOnboarding(chatId, userId, userName);
      }
    } catch (error) {
      console.error("Error handling Telegram onboarding message:", error);
      await this.sendErrorMessage(chatId);
    }
  }

  /**
   * Handle start command - for new users or returning users
   */
  static async handleStart(
    chatId: number | string,
    userId: string,
    userName?: string
  ): Promise<void> {
    try {
      // Check if user already exists by Telegram User ID
      const userCheck = await checkUserExistsByTelegramUserIdWithEmail(userId);

      if (userCheck.exists && userCheck.hasEmail) {
        // User exists and has email - welcome them back
        await TelegramMessageHandlerService.handleWelcomeBack(
          chatId,
          userCheck.user,
          userName
        );
        return;
      }

      // Check if user is already in onboarding process
      const existingState = telegramOnboardingStateManager.getState(userId);

      if (existingState) {
        // User is already in onboarding - just continue without restart message
        await this.startOnboarding(chatId, userId, userName);
      } else {
        // New user - start fresh onboarding
        await this.startOnboarding(chatId, userId, userName);
      }
    } catch (error) {
      console.error("Error handling Telegram start command:", error);
      await this.sendErrorMessage(chatId);
    }
  }

  /**
   * Handle restart command
   */
  static async handleRestart(
    chatId: number | string,
    userId: string,
    userName?: string
  ): Promise<void> {
    try {
      // Clear any existing onboarding state
      telegramOnboardingStateManager.clearState(userId);

      // Send restart confirmation
      await TelegramBotService.sendMessage({
        text: TelegramMessageTemplates.getRestartConfirmationMessage(),
        chat_id: chatId,
      });

      // Start fresh onboarding
      await this.startOnboarding(chatId, userId, userName);
    } catch (error) {
      console.error("Error handling Telegram restart:", error);
      await this.sendErrorMessage(chatId);
    }
  }

  /**
   * Start onboarding process for new user
   */
  private static async startOnboarding(
    chatId: number | string,
    userId: string,
    userName?: string
  ): Promise<void> {
    // Initialize onboarding state
    telegramOnboardingStateManager.startOnboarding(userId, chatId, userName);

    // Send welcome message with inline keyboard
    await TelegramBotService.sendMessage({
      text: TelegramMessageTemplates.getWelcomeMessage(userName || "User"),
      chat_id: chatId,
      reply_markup: TelegramMessageTemplates.getFirstTimeOnboardingKeyboard(),
    });
  }

  /**
   * Handle onboarding steps based on current state
   */
  private static async handleOnboardingStep(
    chatId: string,
    userId: string,
    message: string,
    currentStep: OnboardingStep
  ): Promise<void> {
    switch (currentStep) {
      case OnboardingStep.FIRST_TIME_ONBOARDING_QUESTION:
        await this.handleFirstTimeOnboardingQuestion(chatId, userId, message);
        break;

      case OnboardingStep.EMAIL_REQUEST:
        await this.handleEmailSubmission(chatId, userId, message);
        break;

      case OnboardingStep.EMAIL_OTP_VERIFICATION:
        await this.handleOtpVerification(chatId, userId, message);
        break;

      case OnboardingStep.DEMO_MODE:
        await this.handleDemoMode(chatId, userId, message);
        break;

      default:
        await this.sendErrorMessage(chatId);
        break;
    }
  }

  /**
   * Handle first time onboarding question step (register or demo)
   */
  private static async handleFirstTimeOnboardingQuestion(
    chatId: number | string,
    userId: string,
    message: string
  ): Promise<void> {
    const lowerMessage = message.toLowerCase().trim();

    if (lowerMessage === "register") {
      // User chose to register
      telegramOnboardingStateManager.setChoice(userId, "register");

      // Send registration start message
      await TelegramBotService.sendMessage({
        text: TelegramMessageTemplates.getRegistrationStartMessage(),
        chat_id: chatId,
      });

      // Move to email request step
      telegramOnboardingStateManager.nextStep(userId);
    } else if (lowerMessage === "demo") {
      // User chose demo mode
      telegramOnboardingStateManager.setChoice(userId, "demo");

      // Send demo questions with inline keyboard
      await TelegramBotService.sendMessage({
        text: TelegramMessageTemplates.getDemoModeIntroMessage(),
        chat_id: chatId,
        reply_markup: TelegramMessageTemplates.getDemoQuestionsKeyboard(),
      });

      // Move to demo mode step
      telegramOnboardingStateManager.nextStep(userId);
    } else {
      // Invalid choice - resend welcome message with keyboard
      await TelegramBotService.sendMessage({
        text: "Please select one of the options below:",
        chat_id: chatId,
        reply_markup: TelegramMessageTemplates.getFirstTimeOnboardingKeyboard(),
      });
    }
  }

  /**
   * Handle demo mode interactions
   */
  private static async handleDemoMode(
    chatId: string,
    userId: string,
    message: string
  ): Promise<void> {
    const lowerMessage = message.toLowerCase().trim();

    // Check if user has already used a demo question
    const hasUsedDemo =
      telegramOnboardingStateManager.hasDemoQuestionBeenUsed(userId);

    // Check if user clicked on a demo question
    if (message.startsWith("demo_q_")) {
      // User clicked on a demo question - get the question and send to AI
      const question = TelegramMessageTemplates.getDemoQuestionById(message);

      if (question) {
        // Check if user should be completely ignored (in cooldown and message already sent)
        if (telegramProcessingStateManager.shouldIgnoreUser(userId)) {
          // Silently ignore the message - don't send any response
          return;
        }

        // Check if user is currently processing a demo question
        if (telegramProcessingStateManager.isUserProcessing(userId)) {
          await TelegramBotService.sendMessage({
            text: "🤖 I'm still processing your previous demo question. Please wait...",
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

        // Start processing (this will prevent duplicate requests)
        const canProcess = telegramProcessingStateManager.startProcessing(
          userId,
          chatId,
          "demo_question"
        );

        if (!canProcess) {
          await TelegramBotService.sendMessage({
            text: "🤖 I'm currently busy processing another demo question. Please wait...",
            chat_id: chatId,
          });
          return;
        }

        const selectedQuestionInfo =
          TelegramMessageTemplates.getAllDemoQuestions().find(
            (q) => q.id === message
          );
        if (selectedQuestionInfo) {
          await TelegramBotService.sendMessage({
            text: `📝 You asked: ${selectedQuestionInfo.title}\n\n"${question}"`,
            chat_id: chatId,
            parse_mode: "Markdown",
          });
        }

        // Mark that user has used a demo question
        telegramOnboardingStateManager.setDemoQuestionUsed(userId);

        try {
          // Send acknowledgment message immediately
          await TelegramBotService.sendMessage({
            text: "🤖 Astryx AI is analyzing your query... please wait 🔍",
            chat_id: chatId,
          });

          // Send question to AI microservice

          const aiResult = await AIChatService.processUserQuery(
            userId,
            question,
            chatId
          );

          if (aiResult.success) {
            // Send demo reply with inline keyboard (only Register button)
            await TelegramBotService.sendMessage({
              text: TelegramMessageTemplates.getDemoReplyPrefix(),
              reply_markup:
                TelegramMessageTemplates.getDemoReplyAfterResponseKeyboard(),
              parse_mode: "Markdown",
              chat_id: chatId,
            });
          } else {
            // Fallback response if AI fails
            await TelegramBotService.sendMessage({
              text:
                TelegramMessageTemplates.getDemoReplyPrefix() +
                "Sorry, I'm currently experiencing technical difficulties. Please try another question or register for full access to our AI capabilities.",
              chat_id: chatId,
              reply_markup:
                TelegramMessageTemplates.getDemoReplyAfterResponseKeyboard(),
              parse_mode: "Markdown",
            });
          }
        } catch (error) {
          console.error("Error processing demo question with AI:", error);
          // Send error response with keyboard (only Register button)
          await TelegramBotService.sendMessage({
            text:
              TelegramMessageTemplates.getDemoReplyPrefix() +
              "Sorry, I encountered an error processing your question. Please try again or register for full access.",
            chat_id: chatId,
            reply_markup:
              TelegramMessageTemplates.getDemoReplyAfterResponseKeyboard(),
            parse_mode: "Markdown",
          });
        } finally {
          // Always end processing to start cooldown
          telegramProcessingStateManager.endProcessing(userId);
        }
      } else {
        // Invalid question ID - if user has used demo before, send register CTA, otherwise show new demo questions
        if (hasUsedDemo) {
          await TelegramBotService.sendMessage({
            text: TelegramMessageTemplates.getRegisterCtaMessage(),
            chat_id: chatId,
            reply_markup: TelegramMessageTemplates.getRegisterCtaKeyboard(),
          });
        } else {
          await this.sendNewDemoQuestions(chatId);
        }
      }
    } else if (lowerMessage === "register") {
      // User wants to register from demo mode
      telegramOnboardingStateManager.setChoice(userId, "register");

      await TelegramBotService.sendMessage({
        text: TelegramMessageTemplates.getRegistrationStartMessage(),
        chat_id: chatId,
      });

      // Move to email request step
      telegramOnboardingStateManager.updateState(userId, {
        currentStep: OnboardingStep.EMAIL_REQUEST,
      });
    } else if (lowerMessage === "demo_new_questions") {
      // User wants to see new demo questions
      await this.sendNewDemoQuestions(chatId);
    } else {
      // Any other message in demo mode
      if (hasUsedDemo) {
        // User has already used a demo question, send register CTA
        await TelegramBotService.sendMessage({
          text: TelegramMessageTemplates.getRegisterCtaMessage(),
          chat_id: chatId,
          reply_markup: TelegramMessageTemplates.getRegisterCtaKeyboard(),
        });
      } else {
        // User hasn't used demo yet, show demo questions again
        await TelegramBotService.sendMessage({
          text: "Please select one of the demo questions below:",
          chat_id: chatId,
          reply_markup: TelegramMessageTemplates.getDemoQuestionsKeyboard(),
        });
      }
    }
  }

  /**
   * Send new demo questions
   */
  private static async sendNewDemoQuestions(
    chatId: number | string
  ): Promise<void> {
    await TelegramBotService.sendMessage({
      text: TelegramMessageTemplates.getDemoModeIntroMessage(),
      chat_id: chatId,
      reply_markup: TelegramMessageTemplates.getDemoQuestionsKeyboard(),
    });
  }

  /**
   * Handle email submission
   */
  private static async handleEmailSubmission(
    chatId: number | string,
    userId: string,
    email: string
  ): Promise<void> {
    // Validate email format
    if (!validateEmail(email)) {
      await TelegramBotService.sendMessage({
        text: TelegramMessageTemplates.getEmailValidationErrorMessage(),
        chat_id: chatId,
      });
      return;
    }

    try {
      // Store email in onboarding state
      telegramOnboardingStateManager.setEmail(userId, email);

      // Generate and send OTP
      const otpResult = await emailOtpCache.sendEmailOTP(email);

      if (otpResult.error === null) {
        // Move to OTP verification step
        telegramOnboardingStateManager.nextStep(userId);

        await TelegramBotService.sendMessage({
          text: TelegramMessageTemplates.getOtpSentMessage(email),
          chat_id: chatId,
          parse_mode: "Markdown",
        });
      } else {
        await TelegramBotService.sendMessage({
          text:
            otpResult.message ||
            "Failed to send verification code. Please try again.",
          chat_id: chatId,
        });
      }
    } catch (error) {
      console.error("Error handling email submission:", error);
      await TelegramBotService.sendMessage({
        text: "An error occurred while processing your email. Please try again.",
        chat_id: chatId,
      });
    }
  }

  /**
   * Handle OTP verification
   */
  private static async handleOtpVerification(
    chatId: number | string,
    userId: string,
    otp: string
  ): Promise<void> {
    const state = telegramOnboardingStateManager.getState(userId);
    if (!state || !state.email) {
      await this.sendErrorMessage(chatId);
      return;
    }

    try {
      // Verify OTP
      const otpResult = await emailOtpCache.verifyEmailOTP(state.email, otp);

      if (otpResult.isValid) {
        // OTP is valid - create user account
        const userCreated = await createTelegramUserWithSupabase({
          email: state.email,
          telegramUserId: userId, // Use userId as Telegram User ID
          displayName: state.userName,
          metadata: {
            onboarded_via: "telegram",
          },
          existingUserId: otpResult.user?.id, // Use existing user ID if available
        });

        if (userCreated.error === null) {
          // Registration successful
          telegramOnboardingStateManager.updateState(userId, {
            currentStep: OnboardingStep.COMPLETED,
          });

          await TelegramBotService.sendMessage({
            text: TelegramMessageTemplates.getRegistrationSuccessMessage(),
            chat_id: chatId,
            parse_mode: "Markdown",
          });

          // Clear onboarding state
          telegramOnboardingStateManager.clearState(userId);
        } else {
          await TelegramBotService.sendMessage({
            text:
              userCreated.message ||
              "Registration failed. Please try again later.",
            chat_id: chatId,
          });
        }
      } else {
        // Invalid OTP
        const updatedState =
          telegramOnboardingStateManager.incrementOtpAttempts(userId);
        const attemptsLeft =
          otpResult.attemptsRemaining || 3 - (updatedState?.otpAttempts || 0);

        if (attemptsLeft <= 0) {
          // Too many failed attempts
          telegramOnboardingStateManager.clearState(userId);
        }

        await TelegramBotService.sendMessage({
          text: TelegramMessageTemplates.getOtpVerificationErrorMessage(
            attemptsLeft
          ),
          chat_id: chatId,
        });
      }
    } catch (error) {
      console.error("Error handling OTP verification:", error);
      await TelegramBotService.sendMessage({
        text: "An error occurred during verification. Please try again.",
        chat_id: chatId,
      });
    }
  }

  /**
   * Send error message
   */
  private static async sendErrorMessage(
    chatId: number | string
  ): Promise<void> {
    try {
      await TelegramBotService.sendMessage({
        text: TelegramMessageTemplates.getProcessingErrorMessage(),
        chat_id: chatId,
      });
    } catch (error) {
      console.error("Error sending error message:", error);
    }
  }
}

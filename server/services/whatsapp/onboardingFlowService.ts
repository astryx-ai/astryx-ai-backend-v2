import { TwilioWhatsAppService } from "./twilioService";
import {
  onboardingStateManager,
  OnboardingStep,
} from "./onboardingStateManager";
import { checkUserExistsByPhoneWithEmail } from "../../db/queries/users";
import { emailOtpCache } from "../user/emailOtpService";
import {
  createUserWithSupabase,
  validateEmail,
  validatePhone,
} from "../user/supabaseUserService";
import { WhatsAppMessageTemplates } from "./messageTemplates";
import { WhatsAppMessageHandlerService } from "./messageHandlerService";

export class WhatsAppOnboardingFlowService {
  /**
   * Handle incoming WhatsApp message and determine appropriate response
   */
  static async handleMessage(
    phoneNumber: string,
    message: string,
    profileName?: string
  ): Promise<void> {
    try {
      // Normalize phone number to include whatsapp: prefix for Twilio
      const twilioPhoneNumber = phoneNumber.startsWith("whatsapp:")
        ? phoneNumber
        : `whatsapp:${phoneNumber}`;

      // Extract just the phone number for database operations
      const cleanPhoneNumber = phoneNumber.replace("whatsapp:", "");

      // Check if user already exists
      const userCheck = await checkUserExistsByPhoneWithEmail(cleanPhoneNumber);

      if (userCheck.exists && userCheck.hasEmail) {
        // User exists and has email - delegate to message handler service
        await WhatsAppMessageHandlerService.handleExistingUserMessage(
          twilioPhoneNumber,
          message,
          userCheck.user,
          profileName
        );
        return;
      }

      // Check if user is in onboarding process
      const onboardingState = onboardingStateManager.getState(cleanPhoneNumber);

      if (onboardingState) {
        // User is in onboarding - handle based on current step
        await this.handleOnboardingStep(
          twilioPhoneNumber,
          cleanPhoneNumber,
          message,
          onboardingState.currentStep
        );
      } else {
        // New user - start onboarding with profile name
        await this.startOnboarding(
          twilioPhoneNumber,
          cleanPhoneNumber,
          profileName
        );
      }
    } catch (error) {
      console.error("Error handling WhatsApp onboarding message:", error);
      await this.sendErrorMessage(phoneNumber);
    }
  }

  /**
   * Start onboarding process for new user
   */
  private static async startOnboarding(
    twilioPhoneNumber: string,
    cleanPhoneNumber: string,
    profileName?: string
  ): Promise<void> {
    // Initialize onboarding state with profile name
    onboardingStateManager.startOnboarding(cleanPhoneNumber, profileName);

    // Send welcome message using template
    await TwilioWhatsAppService.sendMessage({
      body: WhatsAppMessageTemplates.getWelcomeMessage(),
      to: twilioPhoneNumber,
    });

    // Move to email request step
    onboardingStateManager.nextStep(cleanPhoneNumber);
  }

  /**
   * Handle onboarding steps based on current state
   */
  private static async handleOnboardingStep(
    twilioPhoneNumber: string,
    cleanPhoneNumber: string,
    message: string,
    currentStep: OnboardingStep
  ): Promise<void> {
    switch (currentStep) {
      case OnboardingStep.EMAIL_REQUEST:
        await this.handleEmailSubmission(
          twilioPhoneNumber,
          cleanPhoneNumber,
          message
        );
        break;

      case OnboardingStep.EMAIL_OTP_VERIFICATION:
        await this.handleOtpVerification(
          twilioPhoneNumber,
          cleanPhoneNumber,
          message
        );
        break;

      default:
        await this.sendErrorMessage(twilioPhoneNumber);
        break;
    }
  }

  /**
   * Handle email submission step
   */
  private static async handleEmailSubmission(
    twilioPhoneNumber: string,
    cleanPhoneNumber: string,
    email: string
  ): Promise<void> {
    // Validate email format
    if (!validateEmail(email.trim())) {
      await TwilioWhatsAppService.sendMessage({
        body: WhatsAppMessageTemplates.getInvalidEmailMessage(),
        to: twilioPhoneNumber,
      });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Store email and send OTP
    // Note: Supabase will create the user if they don't exist when sending OTP
    onboardingStateManager.setEmail(cleanPhoneNumber, trimmedEmail);

    const otpResult = await emailOtpCache.sendEmailOTP(trimmedEmail);

    if (otpResult.error) {
      await TwilioWhatsAppService.sendMessage({
        body: WhatsAppMessageTemplates.getOtpSendFailedMessage(
          otpResult.message
        ),
        to: twilioPhoneNumber,
      });
      return;
    }

    // Move to OTP verification step
    onboardingStateManager.nextStep(cleanPhoneNumber);

    await TwilioWhatsAppService.sendMessage({
      body: WhatsAppMessageTemplates.getOtpSentMessage(trimmedEmail),
      to: twilioPhoneNumber,
    });
  }

  /**
   * Handle OTP verification step and complete user registration
   */
  private static async handleOtpVerification(
    twilioPhoneNumber: string,
    cleanPhoneNumber: string,
    otp: string
  ): Promise<void> {
    const state = onboardingStateManager.getState(cleanPhoneNumber);
    if (!state?.email) {
      await this.sendErrorMessage(twilioPhoneNumber);
      return;
    }

    // Validate OTP format
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp.trim())) {
      await TwilioWhatsAppService.sendMessage({
        body: WhatsAppMessageTemplates.getInvalidOtpFormatMessage(),
        to: twilioPhoneNumber,
      });
      return;
    }

    // Verify OTP using Supabase's verification
    const verificationResult = await emailOtpCache.verifyEmailOTP(
      state.email,
      otp.trim()
    );

    if (!verificationResult.isValid) {
      onboardingStateManager.incrementOtpAttempts(cleanPhoneNumber);

      await TwilioWhatsAppService.sendMessage({
        body: WhatsAppMessageTemplates.getOtpVerificationFailedMessage(
          verificationResult.message
        ),
        to: twilioPhoneNumber,
      });
      return;
    }

    // OTP verified successfully - user is already created by Supabase
    const profileName = state.profileName || "User";

    try {
      // Update the existing user with phone number and WhatsApp-specific metadata
      const userCreationResult = await createUserWithSupabase({
        email: state.email,
        phone: cleanPhoneNumber,
        displayName: profileName,
        metadata: {
          onboarding_source: "whatsapp",
          whatsapp_number: cleanPhoneNumber,
          whatsapp_profile_name: profileName,
          onboarding_status: "completed",
        },
        existingUserId: verificationResult.user?.id, // Pass the existing user ID
      });

      if (userCreationResult.error) {
        await TwilioWhatsAppService.sendMessage({
          body: WhatsAppMessageTemplates.getUserCreationFailedMessage(
            userCreationResult.message
          ),
          to: twilioPhoneNumber,
        });
        return;
      }

      // Complete onboarding
      onboardingStateManager.nextStep(cleanPhoneNumber);

      // Send success message
      await TwilioWhatsAppService.sendMessage({
        body: WhatsAppMessageTemplates.getOnboardingCompletedMessage(
          profileName,
          state.email,
          cleanPhoneNumber
        ),
        to: twilioPhoneNumber,
      });

      // Clear onboarding state
      onboardingStateManager.clearState(cleanPhoneNumber);
    } catch (error) {
      console.error("Error completing user onboarding:", error);
      await TwilioWhatsAppService.sendMessage({
        body: WhatsAppMessageTemplates.getUserCreationFailedMessage(
          "Failed to complete account setup. Please try again."
        ),
        to: twilioPhoneNumber,
      });
    }
  }

  /**
   * Send error message
   */
  private static async sendErrorMessage(
    twilioPhoneNumber: string
  ): Promise<void> {
    await TwilioWhatsAppService.sendMessage({
      body: WhatsAppMessageTemplates.getErrorMessage(),
      to: twilioPhoneNumber,
    });
  }

  /**
   * Handle restart command
   */
  static async handleRestart(
    twilioPhoneNumber: string,
    cleanPhoneNumber: string,
    profileName?: string
  ): Promise<void> {
    // Clear any existing onboarding state
    onboardingStateManager.clearState(cleanPhoneNumber);

    // Start fresh onboarding with profile name
    await this.startOnboarding(
      twilioPhoneNumber,
      cleanPhoneNumber,
      profileName
    );
  }
}

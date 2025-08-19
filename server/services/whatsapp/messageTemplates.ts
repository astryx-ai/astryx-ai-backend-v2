export class WhatsAppMessageTemplates {
  /**
   * Welcome message for new users starting onboarding
   */
  static getWelcomeMessage(): string {
    return `🎉 Welcome to Astryx!

I'm here to help you get started. To create your account, I just need your email address for verification.

Please share your email address below:`;
  }

  /**
   * Invalid email format message
   */
  static getInvalidEmailMessage(): string {
    return "❌ Please enter a valid email address format (e.g., user@example.com)";
  }

  /**
   * OTP sent confirmation message
   */
  static getOtpSentMessage(email: string): string {
    return `📧 Great! I've sent a 6-digit verification code to:
${email}

Please check your email and reply with the verification code.

⏰ The code will expire in 10 minutes.`;
  }

  /**
   * Failed to send OTP message
   */
  static getOtpSendFailedMessage(errorMessage: string): string {
    return `❌ Failed to send verification code: ${errorMessage}

Please try again by typing "start" or contact support.`;
  }

  /**
   * Invalid OTP format message
   */
  static getInvalidOtpFormatMessage(): string {
    return "❌ Please enter a valid 6-digit verification code (numbers only).";
  }

  /**
   * OTP verification failed message
   */
  static getOtpVerificationFailedMessage(errorMessage: string): string {
    return `❌ ${errorMessage}

Please try again by typing "start" or contact support.
    `;
  }

  /**
   * User creation failed message
   */
  static getUserCreationFailedMessage(errorMessage: string): string {
    return `❌ Failed to create your account: ${errorMessage}

Please try again by typing "start" or contact support.`;
  }

  /**
   * Onboarding completion success message
   */
  static getOnboardingCompletedMessage(
    name: string,
    email: string,
    phone: string
  ): string {
    return `🎉 Welcome to Astryx, ${name}!

Your account has been created successfully:
📧 Email: ${email}
📱 Phone: ${phone}

You're all set! I'm here to help you with any questions or assistance you need.

What would you like to know about Astryx?`;
  }

  /**
   * Generic error message
   */
  static getErrorMessage(): string {
    return `❌ Sorry, something went wrong. Let me restart the process.

Please type "start" to begin again.`;
  }

  /**
   * Processing error message for users
   */
  static getProcessingErrorMessage(): string {
    return "Sorry, I encountered an error processing your message. Please try again in a few moments.";
  }

  /**
   * Help/instructions message
   */
  static getHelpMessage(): string {
    return `ℹ️ Here's how I can help you:

• If you're a new user, just send me any message to start creating your account
• Type "start" or "restart" to begin the registration process again
• Ask me any trading or finance questions and I'll provide detailed answers
• I can help with strategy development, market analysis, and more
• Your account will be created using your WhatsApp profile name

What would you like to know?`;
  }

  /**
   * Onboarding progress message
   */
  static getProgressMessage(step: string, progress: number): string {
    const progressBar =
      "▓".repeat(Math.floor(progress / 20)) +
      "░".repeat(5 - Math.floor(progress / 20));

    return `📋 Registration Progress: ${progress}%
${progressBar}

Current step: ${step}`;
  }

  /**
   * Timeout message when onboarding expires
   */
  static getTimeoutMessage(): string {
    return `⏰ Your registration session has expired for security reasons.

Please type "start" to begin again.`;
  }

  /**
   * Rate limit message
   */
  static getRateLimitMessage(): string {
    return `⏳ Please wait a moment before sending another message.

I want to make sure I can properly assist you!`;
  }
}

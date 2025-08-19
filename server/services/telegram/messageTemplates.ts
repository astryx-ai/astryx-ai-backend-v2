export class TelegramMessageTemplates {
  /**
   * Demo questions for the demo mode
   */
  private static readonly DEMO_QUESTIONS = [
    {
      title: "📊 HDFC Bank Q4 Report",
      id: "demo_q_0",
      description:
        "Get detailed analysis of HDFC Bank's latest quarterly earnings",
      fullQuestion: "Give me a detailed report on HDFC Bank's Q4 earnings",
    },
    {
      title: "🏦 RBI Policy Impact",
      id: "demo_q_1",
      description:
        "Analyze sectors gaining strength after RBI's latest policy changes",
      fullQuestion:
        "What sectors are gaining strength after RBI's latest policy?",
    },
    {
      title: "🚗 Auto Stocks & Budget",
      id: "demo_q_2",
      description:
        "Investment timing analysis for auto stocks before budget announcement",
      fullQuestion: "Is it a good time to buy auto stocks before the budget?",
    },
    {
      title: "⚡ Reliance vs Adani Green",
      id: "demo_q_3",
      description:
        "Compare fundamentals of Reliance and Adani Green over 2 years",
      fullQuestion:
        "Compare Reliance and Adani Green fundamentals for the last 2 years",
    },
    {
      title: "📈 NIFTY Market Sentiment",
      id: "demo_q_4",
      description:
        "Current market sentiment analysis around NIFTY index this week",
      fullQuestion: "What's the market sentiment around NIFTY this week?",
    },
    {
      title: "🌐 Fed Impact on IT Stocks",
      id: "demo_q_5",
      description:
        "US Federal Reserve statement analysis and Indian IT sector impact",
      fullQuestion:
        "Break down the US Fed's statement and its impact on Indian IT stocks",
    },
    {
      title: "📅 Options Expiry News",
      id: "demo_q_6",
      description:
        "Top 5 news items that could affect tomorrow's options expiry",
      fullQuestion:
        "Summarize top 5 news that could affect options expiry tomorrow",
    },
  ];

  /**
   * Get 3 random demo questions
   */
  static getRandomDemoQuestions(): typeof TelegramMessageTemplates.DEMO_QUESTIONS {
    const shuffled = [...this.DEMO_QUESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  /**
   * Get demo question by ID
   */
  static getDemoQuestionById(questionId: string): string | null {
    const question = this.DEMO_QUESTIONS.find((q) => q.id === questionId);
    return question ? question.fullQuestion : null;
  }

  /**
   * Get all demo questions
   */
  static getAllDemoQuestions(): typeof TelegramMessageTemplates.DEMO_QUESTIONS {
    return this.DEMO_QUESTIONS;
  }

  /**
   * Generate inline keyboard for first time onboarding question
   */
  static getFirstTimeOnboardingKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: "🔐 Register", callback_data: "register" },
          { text: "🎮 Try Demo", callback_data: "demo" },
        ],
      ],
    };
  }

  /**
   * Generate inline keyboard for demo questions
   */
  static getDemoQuestionsKeyboard() {
    const randomQuestions = this.getRandomDemoQuestions();
    return {
      inline_keyboard: [
        ...randomQuestions.map((question) => [
          { text: question.title, callback_data: question.id },
        ]),
        [{ text: "🔐 Register for Full Access", callback_data: "register" }],
      ],
    };
  }

  /**
   * Generate inline keyboard for demo reply
   */
  static getDemoReplyKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: "🔄 Try Another Question",
            callback_data: "demo_new_questions",
          },
          { text: "🔐 Register Now", callback_data: "register" },
        ],
      ],
    };
  }

  /**
   * Generate inline keyboard for demo reply (after user gets a response)
   */
  static getDemoReplyAfterResponseKeyboard() {
    return {
      inline_keyboard: [
        [{ text: "🔐 Register Now", callback_data: "register" }],
      ],
    };
  }

  /**
   * Generate inline keyboard for register CTA
   */
  static getRegisterCtaKeyboard() {
    return {
      inline_keyboard: [
        [{ text: "🔐 Register Now", callback_data: "register" }],
      ],
    };
  }

  /**
   * Get welcome message for first time users
   */
  static getWelcomeMessage(userName: string): string {
    return `👋 Welcome to Astryx AI, ${userName}!\n\nI'm your AI-powered financial assistant. I can help you with market analysis, stock research, and investment insights.\n\n🤔 What would you like to do?`;
  }

  /**
   * Get registration start message
   */
  static getRegistrationStartMessage(): string {
    return `🎉 Great choice! Let's get you registered.\n\nTo create your account, I'll need your email address. This will allow you to:\n\n✅ Ask unlimited questions\n✅ Get personalized insights\n✅ Access advanced AI features\n✅ Receive market updates\n\nPlease enter your email address:`;
  }

  /**
   * Get email validation error message
   */
  static getEmailValidationErrorMessage(): string {
    return `❌ That doesn't look like a valid email address.\n\nPlease enter a valid email address (e.g., user@example.com):`;
  }

  /**
   * Get OTP sent message
   */
  static getOtpSentMessage(email: string): string {
    return `📧 Perfect! I've sent a verification code to:\n*${email}*\n\nPlease check your email and enter the 6-digit verification code:`;
  }

  /**
   * Get OTP verification error message
   */
  static getOtpVerificationErrorMessage(attemptsLeft: number): string {
    if (attemptsLeft > 0) {
      return `❌ Invalid verification code.\n\nYou have ${attemptsLeft} attempt(s) remaining. Please enter the correct 6-digit code:`;
    } else {
      return `❌ Too many failed attempts.\n\nPlease start over by typing /start`;
    }
  }

  /**
   * Get registration success message
   */
  static getRegistrationSuccessMessage(): string {
    return `🎉 *Registration Complete!*\n\nWelcome to Astryx AI! Your account has been created successfully.\n\nYou can now:\n✅ Ask me any financial questions\n✅ Get real-time market insights\n✅ Access personalized analysis\n\n💬 Go ahead, ask me anything about the markets!`;
  }

  /**
   * Get demo mode introduction message
   */
  static getDemoModeIntroMessage(): string {
    return `🎮 *Demo Mode*\n\nTry out Astryx AI with these sample questions. Choose one to see how I can help with your financial queries:`;
  }

  /**
   * Get demo reply message prefix
   */
  static getDemoReplyPrefix(): string {
    return `🤖 *Astryx AI Demo Response:*\n\n`;
  }

  /**
   * Get register CTA message
   */
  static getRegisterCtaMessage(): string {
    return `🚀 *Ready for more?*\n\nYou've tried our demo! Register now to unlock unlimited questions and personalized insights.\n\n✨ Get full access to Astryx AI's capabilities!`;
  }

  /**
   * Get help message
   */
  static getHelpMessage(): string {
    return `🆘 *Astryx AI Help*\n\n*Commands:*\n/start - Start the bot or continue where you left off\n/restart - Reset your session and start fresh\n/help - Show this help message\n\n*Features:*\n🔐 *Register* - Get unlimited access to AI insights\n🎮 *Demo* - Try sample questions\n💬 *Chat* - Ask any financial questions\n\n*Need support?* Contact our team for assistance.`;
  }

  /**
   * Get processing error message
   */
  static getProcessingErrorMessage(): string {
    return `⚠️ Oops! Something went wrong while processing your message.\n\nPlease try again, or type /help for assistance.`;
  }

  /**
   * Get cooldown message
   */
  static getCooldownMessage(remainingSeconds: number): string {
    return `⏳ Please wait ${remainingSeconds} more second(s) before sending another message.\n\nThis helps ensure optimal response quality for all users.`;
  }

  /**
   * Get user already exists message
   */
  static getUserAlreadyExistsMessage(): string {
    return `✅ *Welcome back!*\n\nYour account is already set up. You can start asking me any financial questions right away!\n\n💬 What would you like to know about the markets today?`;
  }

  /**
   * Get restart confirmation message
   */
  static getRestartConfirmationMessage(): string {
    return `🔄 *Starting fresh...*\n\nI've reset your session. Let's begin!`;
  }
}

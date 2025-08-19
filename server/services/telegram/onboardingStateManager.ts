export enum OnboardingStep {
  FIRST_TIME_ONBOARDING_QUESTION = "first_time_onboarding_question",
  EMAIL_REQUEST = "email_request",
  EMAIL_OTP_VERIFICATION = "email_otp_verification",
  DEMO_MODE = "demo_mode",
  COMPLETED = "completed",
}

interface TelegramOnboardingState {
  userId: string;
  chatId: number | string;
  currentStep: OnboardingStep;
  email?: string;
  userName?: string; // Store Telegram user name
  selectedChoice?: "register" | "demo"; // Track user's choice
  demoQuestionUsed?: boolean; // Track if user has used a demo question
  createdAt: Date;
  lastUpdated: Date;
  otpAttempts?: number;
}

class TelegramOnboardingStateManager {
  private states = new Map<string, TelegramOnboardingState>();
  private readonly ONBOARDING_TIMEOUT_MINUTES = 30;

  /**
   * Start onboarding process for a new user
   */
  startOnboarding(
    userId: string,
    chatId: number | string,
    userName?: string
  ): TelegramOnboardingState {
    const state: TelegramOnboardingState = {
      userId,
      chatId,
      currentStep: OnboardingStep.FIRST_TIME_ONBOARDING_QUESTION,
      userName: userName || "User",
      createdAt: new Date(),
      lastUpdated: new Date(),
      otpAttempts: 0,
    };

    this.states.set(userId, state);

    // Auto-cleanup after timeout
    setTimeout(() => {
      this.clearState(userId);
    }, this.ONBOARDING_TIMEOUT_MINUTES * 60 * 1000);

    return state;
  }

  /**
   * Get current onboarding state for a user
   */
  getState(userId: string): TelegramOnboardingState | null {
    const state = this.states.get(userId);
    if (!state) return null;

    // Check if state has expired
    const now = new Date();
    const timeDiff = now.getTime() - state.lastUpdated.getTime();
    const timeoutMs = this.ONBOARDING_TIMEOUT_MINUTES * 60 * 1000;

    if (timeDiff > timeoutMs) {
      this.clearState(userId);
      return null;
    }

    return state;
  }

  /**
   * Update onboarding state
   */
  updateState(
    userId: string,
    updates: Partial<TelegramOnboardingState>
  ): TelegramOnboardingState | null {
    const currentState = this.getState(userId);
    if (!currentState) return null;

    const updatedState = {
      ...currentState,
      ...updates,
      lastUpdated: new Date(),
    };

    this.states.set(userId, updatedState);
    return updatedState;
  }

  /**
   * Move to next step in onboarding
   */
  nextStep(userId: string): TelegramOnboardingState | null {
    const currentState = this.getState(userId);
    if (!currentState) return null;

    let nextStep: OnboardingStep;

    switch (currentState.currentStep) {
      case OnboardingStep.FIRST_TIME_ONBOARDING_QUESTION:
        // The next step depends on user's choice
        if (currentState.selectedChoice === "register") {
          nextStep = OnboardingStep.EMAIL_REQUEST;
        } else if (currentState.selectedChoice === "demo") {
          nextStep = OnboardingStep.DEMO_MODE;
        } else {
          // Stay at current step if no choice made
          return currentState;
        }
        break;

      case OnboardingStep.EMAIL_REQUEST:
        nextStep = OnboardingStep.EMAIL_OTP_VERIFICATION;
        break;

      case OnboardingStep.EMAIL_OTP_VERIFICATION:
        nextStep = OnboardingStep.COMPLETED;
        break;

      case OnboardingStep.DEMO_MODE:
        // Demo mode doesn't automatically progress
        return currentState;

      case OnboardingStep.COMPLETED:
        // Already completed
        return currentState;

      default:
        return currentState;
    }

    return this.updateState(userId, { currentStep: nextStep });
  }

  /**
   * Set user's choice (register or demo)
   */
  setChoice(
    userId: string,
    choice: "register" | "demo"
  ): TelegramOnboardingState | null {
    return this.updateState(userId, { selectedChoice: choice });
  }

  /**
   * Set user's email
   */
  setEmail(userId: string, email: string): TelegramOnboardingState | null {
    return this.updateState(userId, { email });
  }

  /**
   * Mark that user has used a demo question
   */
  setDemoQuestionUsed(userId: string): TelegramOnboardingState | null {
    return this.updateState(userId, { demoQuestionUsed: true });
  }

  /**
   * Check if user has used a demo question
   */
  hasDemoQuestionBeenUsed(userId: string): boolean {
    const state = this.getState(userId);
    return state?.demoQuestionUsed === true;
  }

  /**
   * Increment OTP attempts
   */
  incrementOtpAttempts(userId: string): TelegramOnboardingState | null {
    const currentState = this.getState(userId);
    if (!currentState) return null;

    const newAttempts = (currentState.otpAttempts || 0) + 1;
    return this.updateState(userId, { otpAttempts: newAttempts });
  }

  /**
   * Reset OTP attempts
   */
  resetOtpAttempts(userId: string): TelegramOnboardingState | null {
    return this.updateState(userId, { otpAttempts: 0 });
  }

  /**
   * Clear onboarding state for a user
   */
  clearState(userId: string): void {
    this.states.delete(userId);
    console.log(`Cleared onboarding state for Telegram user: ${userId}`);
  }

  /**
   * Get all active states (for debugging)
   */
  getAllStates(): Map<string, TelegramOnboardingState> {
    return new Map(this.states);
  }

  /**
   * Clear expired states manually
   */
  clearExpiredStates(): number {
    const now = new Date();
    const timeoutMs = this.ONBOARDING_TIMEOUT_MINUTES * 60 * 1000;
    let clearedCount = 0;

    for (const [userId, state] of this.states.entries()) {
      const timeDiff = now.getTime() - state.lastUpdated.getTime();
      if (timeDiff > timeoutMs) {
        this.states.delete(userId);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      console.log(`Cleared ${clearedCount} expired Telegram onboarding states`);
    }

    return clearedCount;
  }
}

// Export singleton instance
export const telegramOnboardingStateManager =
  new TelegramOnboardingStateManager();

// Auto-cleanup expired states every 10 minutes
setInterval(() => {
  telegramOnboardingStateManager.clearExpiredStates();
}, 10 * 60 * 1000);

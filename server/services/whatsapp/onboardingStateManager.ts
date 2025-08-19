export enum OnboardingStep {
  WELCOME = "welcome",
  EMAIL_REQUEST = "email_request",
  EMAIL_OTP_VERIFICATION = "email_otp_verification",
  COMPLETED = "completed",
}

interface OnboardingState {
  phoneNumber: string;
  currentStep: OnboardingStep;
  email?: string;
  profileName?: string; // Store WhatsApp profile name instead of user-entered name
  createdAt: Date;
  lastUpdated: Date;
  otpAttempts?: number;
}

class WhatsAppOnboardingStateManager {
  private states = new Map<string, OnboardingState>();
  private readonly ONBOARDING_TIMEOUT_MINUTES = 30;

  /**
   * Start onboarding process for a new user
   */
  startOnboarding(phoneNumber: string, profileName?: string): OnboardingState {
    const state: OnboardingState = {
      phoneNumber,
      currentStep: OnboardingStep.WELCOME,
      profileName: profileName || "User", // Default to "User" if no profile name
      createdAt: new Date(),
      lastUpdated: new Date(),
      otpAttempts: 0,
    };

    this.states.set(phoneNumber, state);

    // Auto-cleanup after timeout
    setTimeout(() => {
      this.clearState(phoneNumber);
    }, this.ONBOARDING_TIMEOUT_MINUTES * 60 * 1000);

    return state;
  }

  /**
   * Get current onboarding state for a user
   */
  getState(phoneNumber: string): OnboardingState | null {
    const state = this.states.get(phoneNumber);
    if (!state) return null;

    // Check if state has expired
    const now = new Date();
    const timeDiff = now.getTime() - state.lastUpdated.getTime();
    const timeoutMs = this.ONBOARDING_TIMEOUT_MINUTES * 60 * 1000;

    if (timeDiff > timeoutMs) {
      this.clearState(phoneNumber);
      return null;
    }

    return state;
  }

  /**
   * Update onboarding state
   */
  updateState(
    phoneNumber: string,
    updates: Partial<OnboardingState>
  ): OnboardingState | null {
    const currentState = this.getState(phoneNumber);
    if (!currentState) return null;

    const updatedState = {
      ...currentState,
      ...updates,
      lastUpdated: new Date(),
    };

    this.states.set(phoneNumber, updatedState);
    return updatedState;
  }

  /**
   * Move to next step in onboarding
   */
  nextStep(phoneNumber: string): OnboardingState | null {
    const currentState = this.getState(phoneNumber);
    if (!currentState) return null;

    let nextStep: OnboardingStep;

    switch (currentState.currentStep) {
      case OnboardingStep.WELCOME:
        nextStep = OnboardingStep.EMAIL_REQUEST;
        break;
      case OnboardingStep.EMAIL_REQUEST:
        nextStep = OnboardingStep.EMAIL_OTP_VERIFICATION;
        break;
      case OnboardingStep.EMAIL_OTP_VERIFICATION:
        nextStep = OnboardingStep.COMPLETED; // Skip name collection, go directly to completed
        break;
      default:
        return currentState; // Already completed or invalid state
    }

    return this.updateState(phoneNumber, { currentStep: nextStep });
  }

  /**
   * Set email for user
   */
  setEmail(phoneNumber: string, email: string): OnboardingState | null {
    return this.updateState(phoneNumber, { email });
  }

  /**
   * Update profile name for user
   */
  setProfileName(
    phoneNumber: string,
    profileName: string
  ): OnboardingState | null {
    return this.updateState(phoneNumber, { profileName });
  }

  /**
   * Increment OTP attempts
   */
  incrementOtpAttempts(phoneNumber: string): OnboardingState | null {
    const currentState = this.getState(phoneNumber);
    if (!currentState) return null;

    const newAttempts = (currentState.otpAttempts || 0) + 1;
    return this.updateState(phoneNumber, { otpAttempts: newAttempts });
  }

  /**
   * Check if user is in onboarding process
   */
  isInOnboarding(phoneNumber: string): boolean {
    const state = this.getState(phoneNumber);
    return state !== null && state.currentStep !== OnboardingStep.COMPLETED;
  }

  /**
   * Clear onboarding state
   */
  clearState(phoneNumber: string): void {
    this.states.delete(phoneNumber);
  }

  /**
   * Get onboarding progress percentage
   */
  getProgress(phoneNumber: string): number {
    const state = this.getState(phoneNumber);
    if (!state) return 0;

    const stepOrder = [
      OnboardingStep.WELCOME,
      OnboardingStep.EMAIL_REQUEST,
      OnboardingStep.EMAIL_OTP_VERIFICATION,
      OnboardingStep.COMPLETED,
    ];

    const currentIndex = stepOrder.indexOf(state.currentStep);
    return Math.round((currentIndex / (stepOrder.length - 1)) * 100);
  }
}

// Singleton instance
export const onboardingStateManager = new WhatsAppOnboardingStateManager();

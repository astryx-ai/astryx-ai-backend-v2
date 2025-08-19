interface ProcessingState {
  chatId: number | string;
  isProcessing: boolean;
  startTime: Date;
  queryType?: string;
  lastProcessedTime?: Date; // Track the last time a message was processed
  cooldownMessageSent?: boolean; // Track if cooldown message has been sent
}

class TelegramProcessingStateManager {
  private states: Map<string, ProcessingState> = new Map();
  private readonly COOLDOWN_PERIOD_MS = 5000; // 5 seconds cooldown

  /**
   * Check if user is currently processing a message
   */
  isUserProcessing(userId: string): boolean {
    const state = this.states.get(userId);
    return state?.isProcessing === true;
  }

  /**
   * Check if user is in cooldown period
   */
  isUserInCooldown(userId: string): boolean {
    const state = this.states.get(userId);
    if (!state?.lastProcessedTime) {
      return false;
    }

    const timeSinceLastProcess = Date.now() - state.lastProcessedTime.getTime();
    const isInCooldown = timeSinceLastProcess < this.COOLDOWN_PERIOD_MS;

    // If cooldown period is over, reset the cooldown message flag
    if (!isInCooldown && state.cooldownMessageSent) {
      this.states.set(userId, {
        ...state,
        cooldownMessageSent: false,
      });
    }

    return isInCooldown;
  }

  /**
   * Get remaining cooldown time in seconds
   */
  getRemainingCooldownTime(userId: string): number {
    const state = this.states.get(userId);
    if (!state?.lastProcessedTime) {
      return 0;
    }

    const timeSinceLastProcess = Date.now() - state.lastProcessedTime.getTime();
    const remainingMs = this.COOLDOWN_PERIOD_MS - timeSinceLastProcess;
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  /**
   * Start processing for a user
   */
  startProcessing(
    userId: string,
    chatId: number | string,
    queryType?: string
  ): boolean {
    // Check if user is already processing
    if (this.isUserProcessing(userId)) {
      return false; // Already processing
    }

    // Check if user is in cooldown
    if (this.isUserInCooldown(userId)) {
      return false; // In cooldown period
    }

    // Set processing state
    this.states.set(userId, {
      chatId,
      isProcessing: true,
      startTime: new Date(),
      queryType,
      lastProcessedTime: this.states.get(userId)?.lastProcessedTime,
    });

    return true;
  }

  /**
   * End processing for a user and start cooldown
   */
  endProcessing(userId: string): void {
    const state = this.states.get(userId);
    if (state) {
      this.states.set(userId, {
        ...state,
        isProcessing: false,
        lastProcessedTime: new Date(), // Set cooldown start time
        cooldownMessageSent: false, // Reset cooldown message flag
      });
    }
  }

  /**
   * Get processing state for a user
   */
  getState(userId: string): ProcessingState | undefined {
    return this.states.get(userId);
  }

  /**
   * Check if cooldown message has already been sent to user
   */
  hasCooldownMessageBeenSent(userId: string): boolean {
    const state = this.states.get(userId);
    return state?.cooldownMessageSent === true;
  }

  /**
   * Mark that cooldown message has been sent to user
   */
  setCooldownMessageSent(userId: string): void {
    const state = this.states.get(userId);
    if (state) {
      this.states.set(userId, {
        ...state,
        cooldownMessageSent: true,
      });
    }
  }

  /**
   * Check if user should be completely ignored (in cooldown and message already sent)
   */
  shouldIgnoreUser(userId: string): boolean {
    return (
      this.isUserInCooldown(userId) && this.hasCooldownMessageBeenSent(userId)
    );
  }

  /**
   * Get all processing states (for debugging)
   */
  getAllProcessingStates(): Map<string, ProcessingState> {
    return new Map(this.states);
  }

  /**
   * Force cleanup a user's state (emergency function)
   */
  forceCleanupUser(userId: string): void {
    this.states.delete(userId);
  }

  /**
   * Cleanup old states (call periodically)
   */
  cleanupOldStates(): void {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 10 * 60 * 1000; // 10 minutes

    for (const [userId, state] of this.states.entries()) {
      const timeSinceStart = now - state.startTime.getTime();
      const timeSinceLastProcess = state.lastProcessedTime
        ? now - state.lastProcessedTime.getTime()
        : 0;

      // Clean up if:
      // 1. Processing for more than 10 minutes (stuck state)
      // 2. Last processed more than 10 minutes ago and not currently processing
      if (
        timeSinceStart > CLEANUP_THRESHOLD ||
        (!state.isProcessing && timeSinceLastProcess > CLEANUP_THRESHOLD)
      ) {
        this.states.delete(userId);
      }
    }
  }
}

// Export singleton instance
export const telegramProcessingStateManager =
  new TelegramProcessingStateManager();

// Auto-cleanup every 5 minutes
setInterval(() => {
  telegramProcessingStateManager.cleanupOldStates();
}, 5 * 60 * 1000);

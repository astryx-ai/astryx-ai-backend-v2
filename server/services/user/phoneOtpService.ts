import crypto from "crypto";

interface OTPRecord {
  otp: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

class OTPCache {
  private cache = new Map<string, OTPRecord>();
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_EXPIRY_MINUTES = 10;

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Create and store an OTP for a phone number
   */
  createOTP(phoneNumber: string): string {
    const otp = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    this.cache.set(phoneNumber, {
      otp,
      expiresAt,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
    });

    // Auto-cleanup expired OTP
    setTimeout(() => {
      this.cache.delete(phoneNumber);
    }, this.OTP_EXPIRY_MINUTES * 60 * 1000);

    return otp;
  }

  /**
   * Verify an OTP for a phone number
   */
  verifyOTP(
    phoneNumber: string,
    inputOtp: string
  ): {
    isValid: boolean;
    message: string;
    attemptsRemaining?: number;
  } {
    const record = this.cache.get(phoneNumber);

    if (!record) {
      return {
        isValid: false,
        message: "OTP not found or expired. Please request a new OTP.",
      };
    }

    // Check if OTP has expired
    if (new Date() > record.expiresAt) {
      this.cache.delete(phoneNumber);
      return {
        isValid: false,
        message: "OTP has expired. Please request a new OTP.",
      };
    }

    // Check if max attempts exceeded
    if (record.attempts >= record.maxAttempts) {
      this.cache.delete(phoneNumber);
      return {
        isValid: false,
        message:
          "Maximum verification attempts exceeded. Please request a new OTP.",
      };
    }

    // Increment attempt count
    record.attempts++;

    // Verify OTP
    if (record.otp === inputOtp) {
      this.cache.delete(phoneNumber); // Remove OTP after successful verification
      return {
        isValid: true,
        message: "OTP verified successfully.",
      };
    }

    // Wrong OTP
    const attemptsRemaining = record.maxAttempts - record.attempts;
    if (attemptsRemaining <= 0) {
      this.cache.delete(phoneNumber);
      return {
        isValid: false,
        message:
          "Invalid OTP. Maximum attempts exceeded. Please request a new OTP.",
      };
    }

    return {
      isValid: false,
      message: `Invalid OTP. ${attemptsRemaining} attempts remaining.`,
      attemptsRemaining,
    };
  }

  /**
   * Check if an OTP exists for a phone number
   */
  hasOTP(phoneNumber: string): boolean {
    const record = this.cache.get(phoneNumber);
    return record !== undefined && new Date() <= record.expiresAt;
  }

  /**
   * Remove OTP for a phone number
   */
  removeOTP(phoneNumber: string): void {
    this.cache.delete(phoneNumber);
  }

  /**
   * Get remaining time for OTP in minutes
   */
  getOTPExpiryTime(phoneNumber: string): number | null {
    const record = this.cache.get(phoneNumber);
    if (!record) return null;

    const now = new Date();
    const diffMs = record.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60)));
  }
}

// Singleton instance
export const otpCache = new OTPCache();

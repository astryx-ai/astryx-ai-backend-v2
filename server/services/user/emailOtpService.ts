import { supabase } from "../../db/supabase";

interface EmailOTPRecord {
  email: string;
  sentAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

class EmailOTPCache {
  private cache = new Map<string, EmailOTPRecord>();
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly RATE_LIMIT_MINUTES = 1; // Rate limit for sending OTPs

  /**
   * Send OTP to email address via Supabase
   */
  async sendEmailOTP(email: string): Promise<{
    data: any;
    message: string;
    error: string | null;
  }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          data: null,
          message: "Invalid email format",
          error: "Invalid email format",
        };
      }

      // Check rate limiting
      if (this.hasRecentOTP(email)) {
        const remainingTime = this.getOTPExpiryTime(email);
        return {
          data: null,
          message: `Please wait ${remainingTime} minutes before requesting a new verification code.`,
          error: "Rate limited",
        };
      }

      // Use Supabase to send OTP via email
      // This will create a user if they don't exist and send the OTP
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true, // This creates the user and sends OTP
          data: {
            onboarding_source: "whatsapp",
            onboarding_status: "email_verification_pending",
          },
        },
      });

      if (error) {
        console.error("Supabase OTP send error:", error);
        return {
          data: null,
          message: "Failed to send verification code to email",
          error: error.message,
        };
      }

      // Store rate limiting record (not the actual OTP since Supabase handles that)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

      this.cache.set(email, {
        email,
        sentAt: new Date(),
        expiresAt,
        attempts: 0,
        maxAttempts: this.MAX_ATTEMPTS,
      });

      // Auto-cleanup expired record
      setTimeout(() => {
        this.cache.delete(email);
      }, this.OTP_EXPIRY_MINUTES * 60 * 1000);

      return {
        data: {
          email,
          expiresInMinutes: this.OTP_EXPIRY_MINUTES,
        },
        message: "Verification code sent to your email",
        error: null,
      };
    } catch (error: any) {
      console.error("Error sending email OTP:", error);
      return {
        data: null,
        message: "Failed to send verification code",
        error: error.message || "Unknown error",
      };
    }
  }

  /**
   * Verify email OTP using Supabase's verification
   */
  async verifyEmailOTP(
    email: string,
    inputOtp: string
  ): Promise<{
    isValid: boolean;
    message: string;
    user?: any;
    attemptsRemaining?: number;
  }> {
    const record = this.cache.get(email);

    if (!record) {
      return {
        isValid: false,
        message: "No verification request found. Please request a new OTP.",
      };
    }

    // Check if max attempts exceeded
    if (record.attempts >= record.maxAttempts) {
      this.cache.delete(email);
      return {
        isValid: false,
        message:
          "Maximum verification attempts exceeded. Please request a new OTP.",
      };
    }

    // Increment attempt count
    record.attempts++;

    try {
      // Use Supabase's verifyOtp method
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: inputOtp,
        type: "email",
      });

      if (error) {
        console.error("Supabase OTP verification error:", error);

        const attemptsRemaining = record.maxAttempts - record.attempts;
        if (attemptsRemaining <= 0) {
          this.cache.delete(email);
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

      if (!data.user) {
        return {
          isValid: false,
          message: "Verification failed. Please try again.",
        };
      }

      // OTP verified successfully
      this.cache.delete(email); // Remove record after successful verification

      return {
        isValid: true,
        message: "Email verified successfully.",
        user: data.user,
      };
    } catch (error: any) {
      console.error("Error verifying OTP:", error);

      const attemptsRemaining = record.maxAttempts - record.attempts;
      if (attemptsRemaining <= 0) {
        this.cache.delete(email);
        return {
          isValid: false,
          message:
            "Verification failed. Maximum attempts exceeded. Please request a new OTP.",
        };
      }

      return {
        isValid: false,
        message: `Verification failed. ${attemptsRemaining} attempts remaining.`,
        attemptsRemaining,
      };
    }
  }

  /**
   * Check if an OTP was sent recently (for rate limiting)
   */
  hasRecentOTP(email: string): boolean {
    const record = this.cache.get(email);
    if (!record) return false;

    const now = new Date();
    const timeSinceSent = now.getTime() - record.sentAt.getTime();
    const rateLimitMs = this.RATE_LIMIT_MINUTES * 60 * 1000;

    return timeSinceSent < rateLimitMs;
  }

  /**
   * Remove OTP record for an email
   */
  removeOTP(email: string): void {
    this.cache.delete(email);
  }

  /**
   * Get remaining time for rate limit in minutes
   */
  getOTPExpiryTime(email: string): number | null {
    const record = this.cache.get(email);
    if (!record) return null;

    const now = new Date();
    const timeSinceSent = now.getTime() - record.sentAt.getTime();
    const rateLimitMs = this.RATE_LIMIT_MINUTES * 60 * 1000;
    const remainingMs = rateLimitMs - timeSinceSent;

    return Math.max(0, Math.ceil(remainingMs / (1000 * 60)));
  }
}

// Singleton instance
export const emailOtpCache = new EmailOTPCache();

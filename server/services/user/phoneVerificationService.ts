import { TwilioWhatsAppService } from "../whatsapp";
import { otpCache } from "./phoneOtpService";
import { updateUserData } from "../../db/queries/users";

/**
 * Send OTP to phone number via WhatsApp
 */
export const sendPhoneVerificationOTP = async (
  phoneNumber: string,
  userId?: string
) => {
  try {
    // Validate phone number format (should include country code)
    if (!phoneNumber.startsWith("+")) {
      return {
        data: null,
        message: "Phone number must include country code (e.g., +1234567890)",
        error: "Invalid phone format",
      };
    }

    // Check if there's already an active OTP
    if (otpCache.hasOTP(phoneNumber)) {
      const remainingTime = otpCache.getOTPExpiryTime(phoneNumber);
      return {
        data: null,
        message: `OTP already sent. Please wait ${remainingTime} minutes before requesting a new one.`,
        error: "OTP already active",
      };
    }

    // Generate new OTP
    const otp = otpCache.createOTP(phoneNumber);

    // Format WhatsApp message with OTP
    const message = `🔐 Astryx Verification Code\n\nYour OTP is: *${otp}*\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`;

    // Send OTP via WhatsApp
    const whatsappResult = await TwilioWhatsAppService.sendMessage({
      body: message,
      to: `whatsapp:${phoneNumber}`,
    });

    if (!whatsappResult.success) {
      // Remove OTP if message sending failed
      otpCache.removeOTP(phoneNumber);
      return {
        data: null,
        message: "Failed to send verification code via WhatsApp",
        error: "WhatsApp delivery failed",
      };
    }

    return {
      data: {
        phoneNumber,
        messageSid: whatsappResult.messageSid,
        expiresInMinutes: 10,
      },
      message: "Verification code sent to your WhatsApp",
      error: null,
    };
  } catch (error) {
    console.error("Error sending phone verification OTP:", error);

    // Clean up OTP if there was an error
    otpCache.removeOTP(phoneNumber);

    return {
      data: null,
      message: "Failed to send verification code",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Verify OTP and update user's phone number
 */
export const verifyPhoneAndUpdate = async (
  userId: string,
  phoneNumber: string,
  otp: string
) => {
  try {
    // Validate phone number format
    if (!phoneNumber.startsWith("+")) {
      return {
        data: null,
        message: "Phone number must include country code (e.g., +1234567890)",
        error: "Invalid phone format",
      };
    }

    // Verify OTP
    const otpResult = otpCache.verifyOTP(phoneNumber, otp);

    if (!otpResult.isValid) {
      return {
        data: null,
        message: otpResult.message,
        error: "OTP verification failed",
        attemptsRemaining: otpResult.attemptsRemaining,
      };
    }

    // Update user's phone number in database
    const updatedUser = await updateUserData(userId, {
      phone: phoneNumber,
    });

    if (!updatedUser) {
      return {
        data: null,
        message: "User not found",
        error: "User not found",
      };
    }

    // Send confirmation message via WhatsApp
    try {
      await TwilioWhatsAppService.sendMessage({
        body: `✅ Phone number verified successfully!\n\nWelcome to Astryx! Your phone number ${phoneNumber} has been added to your account.`,
        to: `whatsapp:${phoneNumber}`,
      });
    } catch (confirmationError) {
      // Don't fail the verification if confirmation message fails
      console.error("Failed to send confirmation message:", confirmationError);
    }

    // Extract displayName from metadata
    const userMetadata = updatedUser.rawUserMetaData as any;
    const displayName =
      userMetadata?.display_name ||
      userMetadata?.full_name ||
      userMetadata?.name ||
      null;

    return {
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        displayName: displayName,
        verified: true,
      },
      message: "Phone number verified and updated successfully",
      error: null,
    };
  } catch (error) {
    console.error("Error verifying phone and updating user:", error);
    return {
      data: null,
      message: "Failed to verify phone number",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Check if phone number has pending OTP
 */
export const checkOTPStatus = (phoneNumber: string) => {
  try {
    const hasOTP = otpCache.hasOTP(phoneNumber);
    const expiryTime = otpCache.getOTPExpiryTime(phoneNumber);

    return {
      data: {
        hasPendingOTP: hasOTP,
        expiresInMinutes: expiryTime,
      },
      message: hasOTP ? "OTP is pending verification" : "No pending OTP",
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      message: "Failed to check OTP status",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

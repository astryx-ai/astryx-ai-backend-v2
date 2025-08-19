import { supabase } from "../../db/supabase";
import { updateUserData, getUserByEmail } from "../../db/queries/users";

export interface CreateUserData {
  email: string;
  phone: string;
  displayName?: string;
  metadata?: Record<string, any>;
  existingUserId?: string; // For updating existing users from OTP process
}

export interface CreateTelegramUserData {
  email: string;
  telegramUserId: string;
  displayName?: string;
  metadata?: Record<string, any>;
  existingUserId?: string; // For updating existing users from OTP process
}

/**
 * Create a new user via Supabase auth with email and phone
 * OR update an existing user if existingUserId is provided
 */
export const createUserWithSupabase = async (userData: CreateUserData) => {
  try {
    const {
      email,
      phone,
      displayName,
      metadata = {},
      existingUserId,
    } = userData;

    // Prepare user metadata
    const userMetadata = {
      display_name: displayName,
      phone: phone,
      onboarded_via: "whatsapp",
      onboarded_at: new Date().toISOString(),
      ...metadata,
    };

    if (existingUserId) {
      // User already exists from OTP process - update their data
      try {
        const updatedUser = await updateUserData(existingUserId, {
          phone: phone,
          rawUserMetaData: userMetadata,
        });

        if (!updatedUser) {
          return {
            data: null,
            message: "Failed to update existing user",
            error: "User not found for update",
          };
        }

        console.log(
          `Existing user updated successfully: ${existingUserId}, email: ${email}, phone: ${phone}`
        );

        return {
          data: {
            id: existingUserId,
            email: email,
            phone: phone,
            displayName: displayName,
            createdAt: updatedUser.createdAt,
            userMetadata: userMetadata,
          },
          message: "User account updated successfully",
          error: null,
        };
      } catch (dbError) {
        console.error("Error updating existing user data:", dbError);
        return {
          data: null,
          message: "Failed to update user account",
          error: "Database update failed",
        };
      }
    } else {
      // Create new user with Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: generateTemporaryPassword(), // Generate a secure temporary password
        options: {
          data: userMetadata,
          emailRedirectTo: undefined, // No email confirmation required for WhatsApp onboarding
        },
      });

      if (error) {
        console.error("Supabase user creation error:", error);
        return {
          data: null,
          message: "Failed to create user account",
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          data: null,
          message: "Failed to create user - no user data returned",
          error: "User creation failed",
        };
      }

      // Update the user record with phone number in our database
      try {
        const updatedUser = await updateUserData(data.user.id, {
          phone: phone,
          rawUserMetaData: userMetadata,
        });

        console.log(
          `User created successfully: ${data.user.id}, email: ${email}, phone: ${phone}`
        );

        return {
          data: {
            id: data.user.id,
            email: data.user.email || email,
            phone: phone,
            displayName: displayName,
            createdAt: data.user.created_at,
            userMetadata: userMetadata,
          },
          message: "User account created successfully",
          error: null,
        };
      } catch (dbError) {
        console.error("Error updating user data in database:", dbError);

        // User was created in Supabase but database update failed
        // Still return success since auth user exists
        return {
          data: {
            id: data.user.id,
            email: data.user.email || email,
            phone: phone,
            displayName: displayName,
            createdAt: data.user.created_at,
            userMetadata: userMetadata,
          },
          message: "User account created successfully (database sync pending)",
          error: null,
        };
      }
    }
  } catch (error: any) {
    console.error("Error creating/updating user:", error);
    return {
      data: null,
      message: "Failed to create/update user account",
      error: error.message || "Unknown error",
    };
  }
};

/**
 * Generate a secure temporary password for the user
 * Users will not need this password as they'll authenticate via WhatsApp
 */
function generateTemporaryPassword(): string {
  const length = 16;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
}

/**
 * Check if email is already in use by checking our users table
 */
export const checkEmailExists = async (email: string) => {
  try {
    // Use our database query to check if user exists
    const user = await getUserByEmail(email);

    return {
      exists: !!user,
      error: null,
    };
  } catch (error: any) {
    console.error("Error checking email existence:", error);
    return {
      exists: false,
      error: error.message || "Unknown error",
    };
  }
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Create a new Telegram user via Supabase auth with email and Telegram User ID
 * OR update an existing user if existingUserId is provided
 */
export const createTelegramUserWithSupabase = async (
  userData: CreateTelegramUserData
) => {
  try {
    const {
      email,
      telegramUserId,
      displayName,
      metadata = {},
      existingUserId,
    } = userData;

    // Prepare user metadata
    const userMetadata = {
      display_name: displayName,
      telegram_user_id: telegramUserId,
      onboarded_via: "telegram",
      onboarded_at: new Date().toISOString(),
      ...metadata,
    };

    if (existingUserId) {
      // User already exists from OTP process - update their data
      try {
        const updatedUser = await updateUserData(existingUserId, {
          rawUserMetaData: userMetadata,
        });

        if (!updatedUser) {
          return {
            data: null,
            message: "Failed to update existing user",
            error: "User not found for update",
          };
        }

        return {
          data: {
            id: updatedUser.id,
            email: updatedUser.email || "",
            phone: updatedUser.phone || "",
            telegramUserId: userMetadata.telegram_user_id,
            displayName: userMetadata.display_name,
            createdAt: updatedUser.createdAt,
            userMetadata: userMetadata,
          },
          message: "User updated successfully with Telegram User ID",
          error: null,
        };
      } catch (updateError: any) {
        console.error("Error updating existing user:", updateError);
        return {
          data: null,
          message: "Failed to update existing user",
          error: updateError.message || "Update failed",
        };
      }
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (emailExists.exists) {
      return {
        data: null,
        message: "Email already exists",
        error: "Email already registered",
      };
    }

    // Create new user with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true, // Auto-confirm email since we verified via OTP
        user_metadata: userMetadata,
      });

    if (authError) {
      console.error("Supabase auth user creation error:", authError);
      return {
        data: null,
        message: "Failed to create user account",
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        data: null,
        message: "Failed to create user - no user data returned",
        error: "No user data returned from Supabase",
      };
    }

    // Update the user record with Telegram User ID
    try {
      const updatedUser = await updateUserData(authData.user.id, {
        rawUserMetaData: userMetadata,
      });

      if (!updatedUser) {
        console.error("Failed to update user with Telegram User ID");
        // User was created but failed to update with Telegram ID
        // This is still a partial success
      }

      return {
        data: {
          id: authData.user.id,
          email: authData.user.email || "",
          phone: "", // Telegram users don't have phone initially
          telegramUserId: telegramUserId,
          displayName: displayName,
          createdAt: authData.user.created_at
            ? new Date(authData.user.created_at)
            : null,
          userMetadata: userMetadata,
        },
        message: "User created successfully with Telegram User ID",
        error: null,
      };
    } catch (updateError: any) {
      console.error("Error updating user with Telegram User ID:", updateError);
      // Return success since user was created, just update failed
      return {
        data: {
          id: authData.user.id,
          email: authData.user.email || "",
          phone: "",
          telegramUserId: telegramUserId,
          displayName: displayName,
          createdAt: authData.user.created_at
            ? new Date(authData.user.created_at)
            : null,
          userMetadata: userMetadata,
        },
        message:
          "User created successfully, but failed to update Telegram User ID",
        error: "Failed to update Telegram User ID",
      };
    }
  } catch (error: any) {
    console.error("Error creating Telegram user with Supabase:", error);
    return {
      data: null,
      message: "Failed to create user account",
      error: error.message || "Unknown error",
    };
  }
};

/**
 * Validate phone format (E.164 format)
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

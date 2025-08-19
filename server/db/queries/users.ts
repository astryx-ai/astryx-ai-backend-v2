import { eq, sql } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema";

/**
 * Helper function to extract Telegram User ID from user metadata
 */
export const extractTelegramUserId = (user: any): string | null => {
  if (!user?.rawUserMetaData) return null;

  try {
    const metadata =
      typeof user.rawUserMetaData === "string"
        ? JSON.parse(user.rawUserMetaData)
        : user.rawUserMetaData;
    return metadata?.telegram_user_id || null;
  } catch (error) {
    console.error("Error parsing user metadata:", error);
    return null;
  }
};

/**
 * Get user by ID from auth.users table
 */
export const getUserById = async (userId: string) => {
  try {
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
        rawUserMetaData: users.rawUserMetaData,
        rawAppMetaData: users.rawAppMetaData,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user[0] || null;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

/**
 * Get user by phone number from auth.users table
 */
export const getUserByPhone = async (phoneNumber: string) => {
  try {
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
        rawUserMetaData: users.rawUserMetaData,
        rawAppMetaData: users.rawAppMetaData,
      })
      .from(users)
      .where(eq(users.phone, phoneNumber))
      .limit(1);

    return user[0] || null;
  } catch (error) {
    console.error("Error fetching user by phone:", error);
    throw error;
  }
};

/**
 * Get user by Telegram User ID from auth.users table (stored in metadata)
 */
export const getUserByTelegramUserId = async (telegramUserId: string) => {
  try {
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
        rawUserMetaData: users.rawUserMetaData,
        rawAppMetaData: users.rawAppMetaData,
      })
      .from(users)
      .where(
        sql`${users.rawUserMetaData}->>'telegram_user_id' = ${telegramUserId}`
      )
      .limit(1);

    return user[0] || null;
  } catch (error) {
    console.error("Error fetching user by Telegram User ID:", error);
    throw error;
  }
};

/**
 * Check if user exists by Telegram User ID and has email
 */
export const checkUserExistsByTelegramUserIdWithEmail = async (
  telegramUserId: string
) => {
  try {
    const user = await getUserByTelegramUserId(telegramUserId);

    // Extract telegram user ID from metadata to verify
    const extractedTelegramUserId = extractTelegramUserId(user);

    return {
      exists: !!user,
      hasEmail: !!user?.email,
      user: user
        ? {
            ...user,
            telegramUserId: extractedTelegramUserId,
          }
        : null,
    };
  } catch (error) {
    console.error("Error checking user existence by Telegram User ID:", error);
    throw error;
  }
};

/**
 * Check if user exists by phone number and has email
 */
export const checkUserExistsByPhoneWithEmail = async (phoneNumber: string) => {
  try {
    const user = await getUserByPhone(phoneNumber);
    return {
      exists: !!user,
      hasEmail: !!user?.email,
      user: user,
    };
  } catch (error) {
    console.error("Error checking user existence:", error);
    throw error;
  }
};

/**
 * Get user by email from auth.users table
 */
export const getUserByEmail = async (email: string) => {
  try {
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
        rawUserMetaData: users.rawUserMetaData,
        rawAppMetaData: users.rawAppMetaData,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user[0] || null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw error;
  }
};

/**
 * Update user phone number and metadata
 */
export const updateUserData = async (
  userId: string,
  data: {
    phone?: string;
    rawUserMetaData?: any;
  }
) => {
  try {
    const updatedUser = await db
      .update(users)
      .set({
        ...(data.phone && { phone: data.phone }),
        ...(data.rawUserMetaData && { rawUserMetaData: data.rawUserMetaData }),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
        rawUserMetaData: users.rawUserMetaData,
        rawAppMetaData: users.rawAppMetaData,
      });

    return updatedUser[0] || null;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

import { getUserById, updateUserData } from "../../db/queries/users";

/**
 * Get user profile data
 */
export const getUserProfile = async (userId: string) => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return {
        data: null,
        message: "User not found",
        error: "User not found",
      };
    }

    // Extract displayName from rawUserMetaData
    const userMetadata = user.rawUserMetaData as any;
    const displayName =
      userMetadata?.display_name ||
      userMetadata?.full_name ||
      userMetadata?.name ||
      null;

    return {
      data: {
        email: user.email,
        phone: user.phone,
        displayName: displayName,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        userMetadata: user.rawUserMetaData, // User-provided metadata during signup
        appMetadata: user.rawAppMetaData, // App-specific metadata
      },
      message: "User profile retrieved successfully",
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      message: "Failed to retrieve user profile",
      error,
    };
  }
};

/**
 * Update user onboarding data (phone number and metadata)
 */
export const updateUserOnboardingData = async (
  userId: string,
  data: {
    phone?: string;
    displayName?: string;
    userMetadata?: any;
  }
) => {
  try {
    // Merge displayName into userMetadata if provided
    let updatedMetadata = data.userMetadata || {};
    if (data.displayName) {
      updatedMetadata = {
        ...updatedMetadata,
        display_name: data.displayName,
      };
    }

    const updatedUser = await updateUserData(userId, {
      phone: data.phone,
      rawUserMetaData: updatedMetadata,
    });

    if (!updatedUser) {
      return {
        data: null,
        message: "User not found",
        error: "User not found",
      };
    }

    // Extract displayName from updated metadata
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
        createdAt: updatedUser.createdAt,
        lastSignInAt: updatedUser.lastSignInAt,
        userMetadata: updatedUser.rawUserMetaData,
        appMetadata: updatedUser.rawAppMetaData,
      },
      message: "User data updated successfully",
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      message: "Failed to update user data",
      error,
    };
  }
};

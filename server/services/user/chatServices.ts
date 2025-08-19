import {
  getChatsByUserId,
  getChatById,
  createChat,
  deleteChat,
  updateChatTitle,
  getTelegramChatByUserId,
} from "../../db/queries/chats";
import { InsertChat } from "../../db/schema";

export const getUserChats = async (userId: string) => {
  try {
    const chats = await getChatsByUserId(userId);
    return {
      data: chats,
      message: "Chats retrieved successfully",
      error: null,
    };
  } catch (error) {
    return { data: null, message: "Failed to retrieve chats", error };
  }
};

export const getSingleChat = async (chatId: string, userId: string) => {
  try {
    const chat = await getChatById(chatId, userId);
    if (!chat) {
      return { data: null, message: "Chat not found", error: "Chat not found" };
    }
    return { data: chat, message: "Chat retrieved successfully", error: null };
  } catch (error) {
    return { data: null, message: "Failed to retrieve chat", error };
  }
};

export const createNewChat = async (chatData: InsertChat) => {
  try {
    const newChat = await createChat(chatData);
    return { data: newChat, message: "Chat created successfully", error: null };
  } catch (error) {
    return { data: null, message: "Failed to create chat", error };
  }
};

export const createTelegramChat = async (
  userId: string,
  title: string = "Telegram Chat"
) => {
  try {
    const chatData: InsertChat = {
      userId,
      title,
      isWhatsapp: false,
      isTelegram: true,
    };
    const newChat = await createChat(chatData);
    return {
      data: newChat,
      message: "Telegram chat created successfully",
      error: null,
    };
  } catch (error) {
    return { data: null, message: "Failed to create Telegram chat", error };
  }
};

export const getTelegramChat = async (userId: string) => {
  try {
    const chat = await getTelegramChatByUserId(userId);
    return {
      data: chat || null,
      message: "Telegram chat retrieved successfully",
      error: null,
    };
  } catch (error) {
    return { data: null, message: "Failed to retrieve Telegram chat", error };
  }
};

export const deleteUserChat = async (chatId: string, userId: string) => {
  try {
    const deletedChat = await deleteChat(chatId, userId);
    if (!deletedChat) {
      return { data: null, message: "Chat not found", error: "Chat not found" };
    }
    return {
      data: deletedChat,
      message: "Chat deleted successfully",
      error: null,
    };
  } catch (error) {
    return { data: null, message: "Failed to delete chat", error };
  }
};

export const updateChatDetails = async (
  chatId: string,
  userId: string,
  updateData: { title?: string }
) => {
  try {
    if (updateData.title) {
      const updatedChat = await updateChatTitle(
        chatId,
        userId,
        updateData.title
      );
      if (!updatedChat) {
        return {
          data: null,
          message: "Chat not found",
          error: "Chat not found",
        };
      }
      return {
        data: updatedChat,
        message: "Chat updated successfully",
        error: null,
      };
    }
    return {
      data: null,
      message: "No updates provided",
      error: "No updates provided",
    };
  } catch (error) {
    return { data: null, message: "Failed to update chat", error };
  }
};

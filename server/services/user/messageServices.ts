import { getChatById } from "../../db/queries/chats";
import {
  createMessage,
  getMessagesByChatId,
  getMessageById,
  updateMessage,
} from "../../db/queries/messages";
import { InsertMessage } from "../../db/schema";
import { AIChatService } from "../ai/aiChatService";
import { extractUrls, fetchSourceMeta } from "../../utils/helper";
import { TaskType } from "../../utils/enums";
import embeddingService from "../ai/embeddingService";

export const getChatMessages = async (chatId: string, userId: string) => {
  try {
    // First verify the chat belongs to the user
    const chat = await getChatById(chatId, userId);
    if (!chat) {
      return { data: null, message: "Chat not found", error: "Chat not found" };
    }

    const messages = await getMessagesByChatId(chatId);
    return {
      data: messages,
      message: "Messages retrieved successfully",
      error: null,
    };
  } catch (error) {
    return { data: null, message: "Failed to retrieve messages", error };
  }
};

export const addMessageToChat = async (messageData: InsertMessage) => {
  try {
    // If this is a user message (not AI), get AI response first
    if (!messageData.isAi && messageData.content?.trim()) {
      const aiResult = await AIChatService.processUserQuery(
        messageData.userId,
        messageData.content,
        messageData.chatId
      );

      if (!aiResult.success) {
        return {
          data: null,
          message: aiResult.data?.response || "Failed to get AI response",
          error: aiResult.error || "AI service error",
        };
      }

      // Generate embedding for the user message
      try {
        const embedding = await embeddingService.generateEmbedding(
          messageData.content
        );
        messageData.embedding = embedding;
      } catch (embeddingError) {
        console.error(
          "Failed to generate embedding for user message:",
          embeddingError
        );
        // Continue without embedding if generation fails
      }

      // Create the user message
      await createMessage(messageData);

      // Prepare AI message
      const aiMessageData: InsertMessage = {
        chatId: messageData.chatId,
        userId: messageData.userId,
        content: aiResult.data?.response || "",
        isAi: true,
        aiTokensUsed: aiResult.data?.tokens_used || null,
        aiCost: aiResult.data?.cost ? aiResult.data.cost.toString() : null,
        aiChartData: aiResult.data?.chart_data || null,
      };

      // Generate embedding for the AI response
      try {
        const aiEmbedding = await embeddingService.generateEmbedding(
          aiResult.data?.response || ""
        );
        aiMessageData.embedding = aiEmbedding;
      } catch (embeddingError) {
        console.error(
          "Failed to generate embedding for AI message:",
          embeddingError
        );
        // Continue without embedding if generation fails
      }

      // Extract and fetch source metadata from the AI response text
      const urls = extractUrls(aiResult.data?.response || "");
      if (urls.length) {
        const metas = await Promise.all(
          urls.map(async (u) => await fetchSourceMeta(u))
        );
        // store in DB as jsonb array
        (aiMessageData as any).aiResponseSources = metas.map((m) => ({
          title: m.title,
          url: m.url,
          ogImageUrl: m.ogImageUrl,
        }));
      }

      const aiResponse = await createMessage(aiMessageData);

      const normalizedSources =
        aiResponse && (aiResponse as any).aiResponseSources
          ? (aiResponse as any).aiResponseSources
          : urls.length
          ? urls.map((u) => ({ title: u, url: u, ogImageUrl: null }))
          : null;

      return {
        data: { ...aiResponse, aiResponseSources: normalizedSources },
        message: "AI response generated successfully",
        error: null,
      };
    } else {
      // For AI messages or empty messages, generate embedding if content exists
      if (messageData.content?.trim()) {
        try {
          const embedding = await embeddingService.generateEmbedding(
            messageData.content
          );
          messageData.embedding = embedding;
        } catch (embeddingError) {
          console.error(
            "Failed to generate embedding for message:",
            embeddingError
          );
          // Continue without embedding if generation fails
        }
      }

      const newMessage = await createMessage(messageData);
      return {
        data: newMessage,
        message: "Message created successfully",
        error: null,
      };
    }
  } catch (error) {
    return {
      data: null,
      message: "Failed to create message",
      error,
    };
  }
};

export const updateChatMessage = async (
  messageId: string,
  userId: string,
  updateData: { content?: string }
) => {
  try {
    // First verify the message belongs to the user
    const message = await getMessageById(messageId, userId);
    if (!message) {
      return {
        data: null,
        message: "Message not found",
        error: "Message not found",
      };
    }

    // Don't allow updating AI messages
    if (message.isAi) {
      return {
        data: null,
        message: "Cannot update AI messages",
        error: "Cannot update AI messages",
      };
    }

    const updatedMessage = await updateMessage(messageId, userId, updateData);
    if (!updatedMessage) {
      return {
        data: null,
        message: "Message not found",
        error: "Message not found",
      };
    }

    return {
      data: updatedMessage,
      message: "Message updated successfully",
      error: null,
    };
  } catch (error) {
    return { data: null, message: "Failed to update message", error };
  }
};

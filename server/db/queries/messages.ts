import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { messages, chats } from "../schema";
import { InsertMessage } from "../schema";

// Get messages by chat ID
export const getMessagesByChatId = async (chatId: string) => {
  return await db
    .select({
      id: messages.id,
      chatId: messages.chatId,
      content: messages.content,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      isAi: messages.isAi,
      aiChartData: messages.aiChartData,
      aiResponseSources: messages.aiResponseSources,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.createdAt));
};

// Get message by ID with user verification
export const getMessageById = async (messageId: string, userId: string) => {
  const message = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
    .limit(1);
  return message[0] || null;
};

// Update chat's updatedAt timestamp
export const updateChatTimestamp = async (chatId: string) => {
  return await db
    .update(chats)
    .set({ updatedAt: sql`now()` })
    .where(eq(chats.id, chatId));
};

// Create a new message and update chat timestamp
export const createMessage = async (messageData: InsertMessage) => {
  const newMessage = await db.insert(messages).values(messageData).returning();

  // Update the parent chat's updatedAt timestamp
  await updateChatTimestamp(messageData.chatId);

  return newMessage[0];
};

// Update message content and timestamps
export const updateMessage = async (
  messageId: string,
  userId: string,
  updateData: { content?: string }
) => {
  const updatedMessage = await db
    .update(messages)
    .set({
      ...updateData,
      updatedAt: sql`now()`,
    })
    .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
    .returning();

  if (updatedMessage[0]) {
    // Update the parent chat's updatedAt timestamp
    await updateChatTimestamp(updatedMessage[0].chatId);
  }

  return updatedMessage[0] || null;
};

// Update message embedding (background safe)
export const updateMessageEmbedding = async (
  messageId: string,
  userId: string,
  embedding: number[]
) => {
  const updated = await db
    .update(messages)
    .set({ embedding, updatedAt: sql`now()` })
    .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
    .returning();
  return updated[0] || null;
};

// Delete message
export const deleteMessage = async (messageId: string, userId: string) => {
  const deletedMessage = await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
    .returning();

  if (deletedMessage[0]) {
    // Update the parent chat's updatedAt timestamp
    await updateChatTimestamp(deletedMessage[0].chatId);
  }

  return deletedMessage[0] || null;
};

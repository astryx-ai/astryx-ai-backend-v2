import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { chats } from "../schema";
import { InsertChat } from "../schema";

// Get chats by user ID ordered by updatedAt
export const getChatsByUserId = async (userId: string) => {
  return await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
};

// Get chat by ID with user verification
export const getChatById = async (chatId: string, userId: string) => {
  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  return chat[0]; // Return the first result or undefined
};

// Create new chat
export const createChat = async (chatData: InsertChat) => {
  const newChat = await db.insert(chats).values(chatData).returning();
  return newChat[0];
};

// Update chat's updatedAt timestamp
export const updateChatTimestamp = async (chatId: string) => {
  return await db
    .update(chats)
    .set({ updatedAt: sql`now()` })
    .where(eq(chats.id, chatId));
};

// Update chat title and timestamp
export const updateChatTitle = async (
  chatId: string,
  userId: string,
  title: string
) => {
  const updatedChat = await db
    .update(chats)
    .set({
      title,
      updatedAt: sql`now()`,
    })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning();
  return updatedChat[0] || null;
};

// Delete chat
export const deleteChat = async (chatId: string, userId: string) => {
  const deletedChat = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning();
  return deletedChat[0] || null;
};

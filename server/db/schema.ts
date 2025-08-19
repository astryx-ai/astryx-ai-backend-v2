import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgSchema,
  jsonb,
  integer,
  numeric,
  vector,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define the 'auth' schema to correctly reference Supabase's auth tables
export const authSchema = pgSchema("auth");

// Reference to the existing 'users' table in the 'auth' schema
export const users = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
  rawAppMetaData: jsonb("raw_app_meta_data"),
  rawUserMetaData: jsonb("raw_user_meta_data"),
});

/**
 * ## Chats Table
 * Stores chat sessions for each user.
 */
export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  isWhatsapp: boolean("is_whatsapp").notNull().default(false),
  isTelegram: boolean("is_telegram").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * ## Messages Table
 * Stores individual messages within a chat session.
 */
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isAi: boolean("is_ai").notNull(),
  isWhatsapp: boolean("is_whatsapp").notNull().default(false),
  isTelegram: boolean("is_telegram").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  aiTokensUsed: integer("ai_tokens_used"),
  aiCost: numeric("ai_cost", { precision: 10, scale: 6 }),
  aiChartData: jsonb("ai_chart_data"),
  aiResponseSources: jsonb("ai_response_sources"),
  embedding: vector("embedding", { dimensions: 1536 }), // Using text-embedding-3-small default dimensions
});

// --- Zod Schemas for Validation and Type Inference ---

// Chats
export const insertChatSchema = createInsertSchema(chats);
export const selectChatSchema = createSelectSchema(chats);
export type InsertChat = z.infer<typeof insertChatSchema>;
export type SelectChat = z.infer<typeof selectChatSchema>;

// Messages
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type SelectMessage = z.infer<typeof selectMessageSchema>;

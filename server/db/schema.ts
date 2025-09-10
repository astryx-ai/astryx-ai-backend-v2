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
  index,
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  aiTokensUsed: integer("ai_tokens_used"),
  aiCost: numeric("ai_cost", { precision: 10, scale: 6 }),
  aiChartData: jsonb("ai_chart_data"),
  aiResponseSources: jsonb("ai_response_sources"),
  embedding: vector("embedding", { dimensions: 1536 }),
});

/**
 * ## Stock Documents Table
 * Stores stock-related documents with embeddings.
 */
export const stockDocuments = pgTable(
  "stock_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    ticker: text("ticker").notNull(),
    content: text("content").notNull(),
    source: text("source"),
    type: text("type"),
    metadata: jsonb("metadata"),
    embedding: vector("embedding", { dimensions: 1536 }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idxTicker: index("idx_stock_documents_ticker").on(table.ticker),
    idxPublishedAt: index("idx_stock_documents_pubtime").on(table.publishedAt),
  })
);

/**
 * ## News Documents Table
 * Stores news-related documents with embeddings.
 */
// Placeholder moved below companies to allow FK reference

/**
 * ## Companies Table
 * Master list of companies and identifiers.
 */
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  nseSymbol: text("nse_symbol"),
  bseCode: text("bse_code"),
  bseSymbol: text("bse_symbol"),
  isin: text("isin").unique(),
  industry: text("industry"),
  status: text("status"),
  marketCap: numeric("market_cap"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * ## Stock Prices Table
 * Stores time-series stock prices.
 */
export const stockPrices = pgTable(
  "stock_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    ticker: text("ticker").notNull(),
    price: numeric("price").notNull(),
    volume: numeric("volume"),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  },
  (table) => ({
    idxTickerTime: index("idx_stock_prices_ticker_time").on(
      table.ticker,
      table.recordedAt
    ),
  })
);

/**
 * ## News Documents Table
 */
export const newsDocuments = pgTable(
  "news_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    stockPriceId: uuid("stock_price_id").references(() => stockPrices.id, {
      onDelete: "cascade",
    }),
    ticker: text("ticker"),
    headline: text("headline"),
    url: text("url"),
    content: text("content"),
    publisher: text("publisher"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idxTicker: index("idx_news_documents_ticker").on(table.ticker),
    idxPublishedAt: index("idx_news_documents_published_at").on(
      table.publishedAt
    ),
  })
);

/**
 * ## Invite Codes Table
 * Stores one-time or limited-use invite codes.
 */
export const inviteCodes = pgTable("invite_codes", {
  code: text("code").primaryKey(),
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
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

// Stock Documents
export const insertStockDocumentSchema = createInsertSchema(stockDocuments);
export const selectStockDocumentSchema = createSelectSchema(stockDocuments);
export type InsertStockDocument = z.infer<typeof insertStockDocumentSchema>;
export type SelectStockDocument = z.infer<typeof selectStockDocumentSchema>;

// News Documents
export const insertNewsDocumentSchema = createInsertSchema(newsDocuments);
export const selectNewsDocumentSchema = createSelectSchema(newsDocuments);
export type InsertNewsDocument = z.infer<typeof insertNewsDocumentSchema>;
export type SelectNewsDocument = z.infer<typeof selectNewsDocumentSchema>;

// Companies
export const insertCompanySchema = createInsertSchema(companies);
export const selectCompanySchema = createSelectSchema(companies);
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type SelectCompany = z.infer<typeof selectCompanySchema>;

// Stock Prices
export const insertStockPriceSchema = createInsertSchema(stockPrices);
export const selectStockPriceSchema = createSelectSchema(stockPrices);
export type InsertStockPrice = z.infer<typeof insertStockPriceSchema>;
export type SelectStockPrice = z.infer<typeof selectStockPriceSchema>;

// Invite Codes
export const insertInviteCodeSchema = createInsertSchema(inviteCodes);
export const selectInviteCodeSchema = createSelectSchema(inviteCodes);
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type SelectInviteCode = z.infer<typeof selectInviteCodeSchema>;

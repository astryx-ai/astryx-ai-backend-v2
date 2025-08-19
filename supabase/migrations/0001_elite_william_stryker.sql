ALTER TABLE "messages" ALTER COLUMN "is_ai" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "is_whatsapp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "is_telegram" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_whatsapp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_telegram" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "embedding" vector(1536);
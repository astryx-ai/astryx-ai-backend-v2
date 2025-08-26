DROP INDEX "idx_news_meta_gin";--> statement-breakpoint
ALTER TABLE "news_documents" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "news_documents" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "news_documents" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "news_documents" ADD COLUMN "ticker" text;--> statement-breakpoint
ALTER TABLE "news_documents" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "news_documents" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "news_documents" ADD COLUMN "publisher" text;--> statement-breakpoint
ALTER TABLE "news_documents" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_news_documents_ticker" ON "news_documents" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "idx_news_documents_published_at" ON "news_documents" USING btree ("published_at");
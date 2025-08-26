ALTER TABLE "news_documents" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "news_documents" ADD CONSTRAINT "news_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_news_meta_gin" ON "news_documents" USING gin ("metadata");
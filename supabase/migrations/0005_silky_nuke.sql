ALTER TABLE "news_documents" DROP CONSTRAINT "news_documents_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "news_documents" ADD COLUMN "stock_price_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "news_documents" ADD CONSTRAINT "news_documents_stock_price_id_stock_prices_id_fk" FOREIGN KEY ("stock_price_id") REFERENCES "public"."stock_prices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_documents" ADD CONSTRAINT "news_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
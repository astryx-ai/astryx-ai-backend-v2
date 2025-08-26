CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"nse_symbol" text,
	"bse_code" text,
	"bse_symbol" text,
	"isin" text,
	"industry" text,
	"status" text,
	"market_cap" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_isin_unique" UNIQUE("isin")
);
--> statement-breakpoint
CREATE TABLE "news_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"content" text NOT NULL,
	"source" text,
	"type" text,
	"metadata" jsonb,
	"embedding" vector(1536),
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"price" numeric NOT NULL,
	"volume" numeric,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_stock_documents_ticker" ON "stock_documents" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "idx_stock_documents_pubtime" ON "stock_documents" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_stock_prices_ticker_time" ON "stock_prices" USING btree ("ticker","recorded_at");
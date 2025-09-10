CREATE TABLE "invite_codes" (
  "code" text PRIMARY KEY,
  "max_uses" integer DEFAULT 1,
  "used_count" integer DEFAULT 0,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

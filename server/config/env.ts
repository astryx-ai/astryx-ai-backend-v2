import dotenv from "dotenv";

// Configure dotenv as early as possible
dotenv.config();

// Export environment variables with validation
export const ENV = {
  DATABASE_URL: process.env.DATABASE_URL!,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  AI_MICROSERVICE_URL: process.env.AI_MICROSERVICE_URL!,
  WEBSITES_PORT: process.env.WEBSITES_PORT || "8080",
  NODE_ENV: process.env.NODE_ENV || "development",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
  TWILIO_FROM_WHATSAPP_NUMBER: process.env.TWILIO_FROM_WHATSAPP_NUMBER!,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT!,
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY!,
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT:
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small",
  GRPC_TARGET: process.env.GRPC_TARGET || "localhost:50051",
} as const;

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "AI_MICROSERVICE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_WHATSAPP_NUMBER",
  "TELEGRAM_BOT_TOKEN",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_API_KEY",
  "AI_GRPC_TARGET",
  "GRPC_TARGET",
];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

// if (missingEnvVars.length > 0) {
//   throw new Error(
//     `Missing required environment variables: ${missingEnvVars.join(", ")}`
//   );
// }

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ENV } from "../config/env";

// Database connection
const connectionString = ENV.DATABASE_URL;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);

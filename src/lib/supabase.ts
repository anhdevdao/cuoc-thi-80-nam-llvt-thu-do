import { createClient } from "@supabase/supabase-js";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const databaseUrl = getRequiredEnv("DATABASE_API_URL");
const databasePublishableKey = getRequiredEnv("DATABASE_PUBLISHABLE_KEY");
const databaseSecretKey = getRequiredEnv("DATABASE_SECRET_KEY");

export const supabase = createClient(databaseUrl, databasePublishableKey);

export const supabaseAdmin = createClient(databaseUrl, databaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

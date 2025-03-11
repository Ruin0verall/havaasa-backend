/**
 * Supabase client configuration
 * This file initializes and exports the Supabase client for database operations
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required Supabase configuration. Check your .env file.');
}

/**
 * Main Supabase client instance with service role key for admin operations
 * Used for general database operations
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

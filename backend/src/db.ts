/**
 * Database configuration and utility functions
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types/database";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Environment variables validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase configuration. Check your .env file.');
}

// Database client types
export type DbClient = SupabaseClient<Database>;
export type AuthResponse = Awaited<ReturnType<DbClient['auth']['signInWithPassword']>>['data'];

/**
 * Main database client with anonymous access
 */
export const db: DbClient = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Admin database client with elevated privileges
 * Only available if service role key is provided
 */
export const adminDb: DbClient | null = supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Authenticate user with email and password
 * @param email - User's email
 * @param password - User's password
 * @returns Authentication data
 * @throws Error if authentication fails
 */
export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<AuthResponse> => {
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

/**
 * Check if the current session is authenticated
 * @returns True if authenticated, false otherwise
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await db.auth.getSession();
  return !!session;
};

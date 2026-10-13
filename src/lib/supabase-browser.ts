import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://syardlwbunhoijlnnuvc.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YXJkbHdidW5ob2lqbG5udXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwMTAsImV4cCI6MjEwMDc3MzAxMH0.s96kfILEbhZO9ckCHYWPejKyY4-hel3WOeJby-4xUUw';

// Singleton instance client-side Supabase
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

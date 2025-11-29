import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase project URL and anon key
// You can find these in your Supabase dashboard under Settings > API
// For Vite, use import.meta.env instead of process.env
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://uwwsqjdvhtgfyehusbos.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d3NxamR2aHRnZnllaHVzYm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzM5NzEsImV4cCI6MjA3MjAwOTk3MX0.ezv9KEniri08lXsQ1Nxa6pwrHRsxzxDC73PkiGRHCH8";

// Environment variables loaded

export const supabase = createClient(supabaseUrl, supabaseKey);


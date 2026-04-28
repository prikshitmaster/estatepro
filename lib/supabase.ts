// lib/supabase.ts
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    Supabase is like a Google Sheets in the cloud — it stores your leads.
//    This file creates ONE connection to that Supabase cloud database.
//    Think of it like saving your WiFi password once — then every page in
//    the app uses this same connection. We don't connect 100 times, just once.
//
// 📁 HOW OTHER FILES USE IT:
//    import { supabase } from '@/lib/supabase'
//    Then: supabase.from('leads').select('*')   ← "get all rows from leads table"

import { createClient } from "@supabase/supabase-js";

// These two values come from your .env.local file.
// process.env.SOMETHING means "read the secret called SOMETHING"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createClient() opens the connection to Supabase.
// We export it so every other file can import and use it.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

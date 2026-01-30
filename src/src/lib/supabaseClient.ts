import { createClient } from '@supabase/supabase-js';

// Client Supabase per il browser (Client Components)
// Usa le env NEXT_PUBLIC_* (necessarie in build lato client)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

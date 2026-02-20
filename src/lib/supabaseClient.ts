import { createClient } from '@supabase/supabase-js';

// Client Supabase per il browser (Client Components)
// In CI/build senza env, usiamo fallback innocui per evitare crash in fase di prerender.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

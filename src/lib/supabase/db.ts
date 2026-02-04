
import { createClient } from '@supabase/supabase-js';

/**
 * BEST PRACTICE SERVERLESS:
 * In Netlify Functions, il modulo viene riutilizzato tra le invocazioni (warm start).
 * Memorizzando il client fuori dall'handler, riutilizziamo il pool di connessioni
 * invece di aprirne uno nuovo ad ogni richiesta.
 */

let supabaseInstance: any = null;

export const getDbClient = () => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials in environment variables.");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-application-name': 'skibus-netlify-functions' },
    },
  });

  return supabaseInstance;
};

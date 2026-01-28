
import { createClient } from '@supabase/supabase-js';
import { getDbClient } from '../../../src/lib/supabase/db';

export const getSupabase = () => getDbClient();

export async function authenticate(authHeader?: string) {
  if (!authHeader) return { user: null, error: 'Missing auth header' };
  const token = authHeader.replace('Bearer ', '');
  
  // Per l'autenticazione usiamo il client anonimo (leggero)
  const supabaseAuth = createClient(
    ((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!), 
    ((process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!)
  );
  
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  return { user, error };
}

export async function checkAdmin(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();
  return !!data && !error;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase per chiamate server-side (API routes).
 * - Usa service role se disponibile (API/admin, bypass RLS)
 * - Altrimenti usa anon (public)
 */
export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceRole || anon;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Estrae user tramite Bearer token (Authorization: Bearer <jwt>).
 * Verifica token usando ANON key (scelta pulita e prevedibile).
 * Se non c'è token o non è valido -> user null.
 */
export async function authenticate(authHeader: string): Promise<{ user: { id: string } | null }> {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { user: null };

  const supabaseAnon = createClient(url, anon, { auth: { persistSession: false } });

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user?.id) return { user: null };

  return { user: { id: data.user.id } };
}

/**
 * Check admin definitivo:
 * Richiede tabella public.user_roles con colonne:
 * - user_id (uuid, PK)
 * - role ('admin' | 'client')
 *
 * Ritorna true solo se role === 'admin'
 */
export async function checkAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return data?.role === "admin";
}

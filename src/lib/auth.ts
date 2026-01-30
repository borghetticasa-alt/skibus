import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase per chiamate server-side (API routes).
 * - Usa service role se disponibile (admin)
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
 * Se non c'è token o non è valido -> user null.
 */
export async function authenticate(authHeader: string): Promise<{ user: { id: string } | null }> {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null };

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) return { user: null };
  return { user: { id: data.user.id } };
}

/**
 * Check admin minimale:
 * - se hai una tabella/claim specifica, qui puoi adattare.
 * - Per sbloccare build+deploy, di default: admin = true se passa authenticate().
 */
export async function checkAdmin(userId: string): Promise<boolean> {
  // TODO: se hai una tabella admins o un claim, implementalo qui.
  // Esempio: return (await getSupabase().from("admins").select("user_id").eq("user_id", userId).maybeSingle()).data != null;
  return Boolean(userId);
}


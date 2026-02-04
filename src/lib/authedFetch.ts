// src/lib/authedFetch.ts
import { supabase } from "@/lib/supabaseClient";

type AuthedFetchInit = RequestInit & { headers?: Record<string, string> };

export async function authedFetch(url: string, init: AuthedFetchInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Sessione mancante: fai login di nuovo.");
  }

  const headers: Record<string, string> = {
    ...(init.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return fetch(url, { ...init, headers });
}

export async function authedFetchJson<T>(url: string, init: AuthedFetchInit = {}) {
  const res = await authedFetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const data = (await res.json()) as T;

  if (!res.ok) {
    // prova a leggere errori standard
    const msg = (data as any)?.error || (data as any)?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

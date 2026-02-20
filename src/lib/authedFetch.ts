// src/lib/authedFetch.ts
import { supabase } from '@/lib/supabaseClient';

type AuthedFetchInit = RequestInit & { headers?: HeadersInit };

export async function authedFetch(url: string, init: AuthedFetchInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Sessione mancante: fai login di nuovo.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, { ...init, headers });
}

export async function authedFetchJson<T>(url: string, init: AuthedFetchInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await authedFetch(url, {
    ...init,
    headers,
  });

  const data = (await res.json()) as T;

  if (!res.ok) {
    const msg = (data as any)?.error || (data as any)?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

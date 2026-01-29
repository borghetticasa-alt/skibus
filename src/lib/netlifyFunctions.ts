import { supabase } from "@/lib/supabaseClient";

function normalizePath(input: string) {
  let p = (input || "").trim();
  p = p.replace(/^\/+/, "/");
  p = p.replace(/^\/\.netlify\/functions\//, "");
  p = p.replace(/^\.?netlify\/functions\//, "");
  p = p.replace(/^\/api\//, "");
  p = p.replace(/^\//, "");
  return p;
}

export function apiUrl(path: string) {
  const p = normalizePath(path);
  return `/api/${p}`;
}

type FetchJsonOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  withAuth?: boolean;
};

async function getBearerToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function fetchJson<T = any>(path: string, opts: FetchJsonOptions = {}): Promise<T> {
  const url = apiUrl(path);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  if (opts.withAuth) {
    const token = await getBearerToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...opts, headers });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

<<<<<<< HEAD
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
=======
export function getFunctionsBaseUrl() {
  // Netlify Dev serves functions on port 8888, while Next dev runs on 3000/3001.
  // If the user opened the Next port directly, calls to /.netlify/functions/* will return HTML (Next 404),
  // causing JSON parse errors like: Unexpected token '<'.
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (port && port !== '8888') return `${protocol}//${hostname}:8888`;
  }
  return '';
}

export async function fetchJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const base = getFunctionsBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const res = await fetch(url, init);

  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');

  if (!res.ok) {
    const body = isJson ? JSON.stringify(await res.json()).slice(0, 500) : (await res.text()).slice(0, 500);
    throw new Error(`Request failed (${res.status}) for ${path}: ${body}`);
  }

  if (!isJson) {
    const text = await res.text();
    throw new Error(`Expected JSON from ${path} but got: ${text.slice(0, 120)}`);
  }

  return (await res.json()) as T;
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
}

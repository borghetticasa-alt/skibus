// src/lib/netlifyFunctions.ts
import { supabase } from "@/lib/supabaseClient";

type FetchJsonOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  withAuth?: boolean;
};

function isAbsoluteUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

function getOriginForServer() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function buildUrl(path: string) {
  const p = (path || "").trim();

  if (isAbsoluteUrl(p)) return p;

  // /api/... ok
  if (p.startsWith("/api/")) {
    if (typeof window !== "undefined") return p;
    return `${getOriginForServer()}${p}`;
  }

  // se ti passano "admin/..." o "public-api/..." lo porto a /api/...
  const cleaned = p.replace(/^\/+/, "");
  const finalPath = cleaned.startsWith("api/") ? `/${cleaned}` : `/api/${cleaned}`;

  if (typeof window !== "undefined") return finalPath;
  return `${getOriginForServer()}${finalPath}`;
}

async function getBearerToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function fetchJson<T = any>(path: string, opts: FetchJsonOptions = {}): Promise<T> {
  const url = buildUrl(path);

  const headers: Record<string, string> = {
    ...(opts.headers || {}),
  };

  const bodyIsForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (!bodyIsForm && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

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
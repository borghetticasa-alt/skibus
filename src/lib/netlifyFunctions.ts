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
}

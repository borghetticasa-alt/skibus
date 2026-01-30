type PayPalMode = 'sandbox' | 'live';

function getBaseUrl(): string {
  const mode = (process.env.PAYPAL_MODE as PayPalMode) || 'sandbox';
  return mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

export function requirePayPalEnv() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PayPal env missing: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET');
  }
  return { clientId, clientSecret };
}

let cachedToken: { token: string; expiresAtMs: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = requirePayPalEnv();

  // Cache semplice in-memory (ok su lambda / edge finché non cambia istanza)
  if (cachedToken && Date.now() < cachedToken.expiresAtMs - 30_000) {
    return cachedToken.token;
  }

  const baseUrl = getBaseUrl();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayPal token error: ${res.status} ${txt}`);
  }

  const json: any = await res.json();
  const token = json.access_token as string;
  const expiresIn = Number(json.expires_in || 0);
  cachedToken = { token, expiresAtMs: Date.now() + expiresIn * 1000 };
  return token;
}

export async function paypalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getPayPalAccessToken();
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  const payload = text ? (() => {
    try { return JSON.parse(text); } catch { return text; }
  })() : null;

  if (!res.ok) {
    throw new Error(`PayPal API error ${res.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  }

  return payload as T;
}

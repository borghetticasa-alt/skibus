import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

function paypalBaseUrl() {
  return PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function getPaypalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials mancanti (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error(json?.error_description || `PayPal token error (HTTP ${res.status})`);
  return String(json.access_token || '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const accessToken = await getPaypalAccessToken();

    const capRes = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const capJson = await capRes.json().catch(() => ({} as any));

    if (!capRes.ok) {
      return NextResponse.json(
        { error: capJson?.message || `PayPal capture error (HTTP ${capRes.status})`, detail: capJson },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: capJson }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'PayPal capture error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@lib/auth';

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

function toPaypalAmount(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  // PayPal vuole stringa "12.34" con punto e 2 decimali
  return n.toFixed(2);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tripId = String(body.tripId || '').trim();

    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    // ✅ importo dal DB (no “format italiani”, no NaN)
    const supabase = getSupabase();
    const { data: trip, error: tErr } = await supabase
      .from('trips')
      .select('id, title, destination, base_price')
      .eq('id', tripId)
      .maybeSingle();

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const amountStr = toPaypalAmount(Number((trip as any).base_price ?? 0));
    if (!amountStr) {
      return NextResponse.json(
        { error: 'PayPal amount invalid: base_price deve essere > 0 e numerico (es. 35 o 35.00)' },
        { status: 400 }
      );
    }

    const accessToken = await getPaypalAccessToken();

    const createRes = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: String((trip as any).title || (trip as any).destination || 'Gita'),
            amount: {
              currency_code: 'EUR',
              value: amountStr, // ✅ stringa con 2 decimali
            },
          },
        ],
      }),
    });

    const createJson = await createRes.json().catch(() => ({} as any));
    if (!createRes.ok) {
      return NextResponse.json(
        { error: createJson?.message || `PayPal create-order error (HTTP ${createRes.status})`, detail: createJson },
        { status: 400 }
      );
    }

    const orderId = String(createJson?.id || '');
    if (!orderId) return NextResponse.json({ error: 'PayPal: missing order id' }, { status: 500 });

    return NextResponse.json({ orderId, amount: amountStr }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'PayPal create-order error' }, { status: 500 });
  }
}

import { Handler } from '@netlify/functions';
import { authenticate, getSupabase } from './lib/auth';
import { checkRateLimit } from './lib/rate-limiter';
import { paypalRequest } from './lib/paypal';

function eurosToCents(eur: string | number): number {
  const n = typeof eur === 'string' ? Number(eur) : eur;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { user } = await authenticate(event.headers.authorization);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  const isAllowed = await checkRateLimit(user.id, 'paypal-capture-order', 6, 120);
  if (!isAllowed) return { statusCode: 429, body: JSON.stringify({ error: 'Troppi tentativi PayPal.' }) };

  const body = JSON.parse(event.body || '{}');
  const orderId: string | undefined = body.orderId;
  const bookingId: string | undefined = body.bookingId;
  if (!orderId || !bookingId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderId/bookingId' }) };
  }

  const supabase = getSupabase();

  try {
    const capture = await paypalRequest<any>(`/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const pu = capture.purchase_units?.[0];
    const cap = pu?.payments?.captures?.[0];
    const captureId = cap?.id as string | undefined;
    const amountValue = cap?.amount?.value as string | undefined;
    const amountCents = eurosToCents(amountValue || 0);

    if (!captureId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing captureId from PayPal response' }) };
    }

    // 1) Registriamo il pagamento (best-effort: se tabella/colonne non esistono non blocchiamo)
    try {
      await supabase.from('payments').insert({
        booking_id: bookingId,
        provider: 'paypal',
        provider_payment_id: captureId,
        status: 'paid',
        amount_total: amountCents,
        raw_json: capture,
      });
    } catch (_) {
      // ignore
    }

    // 2) Conferma atomica tramite RPC già esistente (riusata per PayPal)
    const { error: rpcError } = await supabase.rpc('confirm_booking_payment', {
      p_booking_id: bookingId,
      p_stripe_event_id: `paypal:${captureId}`,
      p_payment_intent_id: captureId,
      p_amount: amountCents,
    });

    if (rpcError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Database transaction failed' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, captureId, amount: amountCents / 100 }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

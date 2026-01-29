
import { Handler } from '@netlify/functions';
import { authenticate, checkAdmin, getSupabase } from './lib/auth';
import Stripe from 'stripe';
import { z } from 'zod';
import { paypalRequest } from './lib/paypal';

// NOTE: Netlify build uses the Stripe typings available at install time.
// Some Stripe versions do not expose `Stripe.ApiVersion` as a type export.
// Using `as any` keeps the runtime API version while avoiding a TS hard-fail.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any,
});

const RefundSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(5, "Indicare una motivazione valida per il rimborso"),
  forceFullRefund: z.boolean().default(false)
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  // 1. Auth & Admin Check
  const { user } = await authenticate(event.headers.authorization);
  if (!user || !(await checkAdmin(user.id))) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Accesso negato' }) };
  }

  try {
    const body = RefundSchema.parse(JSON.parse(event.body || '{}'));
    const supabase = getSupabase();

    // 2. Fetch Booking, Trip and Payment Data
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('*, trips(*), payments(*)')
      .eq('id', body.bookingId)
      .single();

    if (bErr || !booking) throw new Error("Prenotazione non trovata");
    if (booking.status !== 'paid') throw new Error("Solo le prenotazioni pagate possono essere rimborsate");
    
    const payment = booking.payments?.find((p: any) => p.status === 'paid');
    if (!payment) throw new Error("Nessun pagamento andato a buon fine trovato per questa prenotazione");

    const now = new Date();

    // 3. Logica business: da "confirm by" in poi nessun rimborso
    // (la data la imposta l'admin; se assente, si fallback al comportamento precedente)
    const confirmByRaw = booking.trips?.confirm_by || booking.trips?.confirm_by_iso || booking.trips?.confirmByISO;
    if (confirmByRaw) {
      const confirmBy = new Date(confirmByRaw);
      if (Number.isFinite(confirmBy.getTime()) && now.getTime() >= confirmBy.getTime()) {
        throw new Error('Rimborso non consentito: la gita è oltre la data di conferma (policy no-refund).');
      }
    }

    // 4. Calcolo Importo Rimborsabile (fallback: vecchia penale se l'admin non forza)
    let amountToRefund = payment.amount_total;
    const departureDate = new Date(booking.trips.departure_date);
    const hoursToDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 3600);

    let penaltyApplied = 0;
    if (!body.forceFullRefund && hoursToDeparture < 48) {
      // Penale del 30% se mancano meno di 48h
      penaltyApplied = Math.round(amountToRefund * 0.3);
      amountToRefund -= penaltyApplied;
    }

    // 5. Esecuzione Rimborso sul provider corretto
    let refundId = '';
    if ((payment.provider || 'stripe') === 'paypal') {
      const captureId = payment.provider_payment_id || payment.paypal_capture_id;
      if (!captureId) throw new Error('Pagamento PayPal senza capture id: rimborso non possibile.');

      const ppRefund = await paypalRequest<any>(`/v2/payments/captures/${captureId}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amount: { currency_code: 'EUR', value: (amountToRefund / 100).toFixed(2) },
          note_to_payer: body.reason
        })
      });
      refundId = ppRefund?.id || `paypal_refund:${captureId}`;
    } else {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: amountToRefund,
        reason: 'requested_by_customer',
        metadata: {
          bookingId: booking.id,
          adminId: user.id,
          reason: body.reason,
          penaltyApplied: penaltyApplied.toString()
        }
      });
      refundId = refund.id;
    }

    // 5. Aggiornamento Database via Transazione RPC (per atomicità)
    // Nota: La RPC deve gestire l'update di bookings, payments e decremento seats_occupied
    const { error: rpcError } = await supabase.rpc('process_booking_refund', {
      p_booking_id: booking.id,
      p_refund_id: refundId,
      p_amount_refunded: amountToRefund,
      p_admin_id: user.id,
      p_admin_note: `${body.reason} (Penale: €${(penaltyApplied/100).toFixed(2)})`
    });

    if (rpcError) throw rpcError;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        status: 'success', 
        refundId,
        refundedAmount: amountToRefund / 100,
        penalty: penaltyApplied / 100
      })
    };

  } catch (err: any) {
    console.error('[Refund Error]', err);
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: err.message || 'Errore durante il rimborso' }) 
    };
  }
};

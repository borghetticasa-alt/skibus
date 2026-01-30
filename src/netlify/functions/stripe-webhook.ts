
import { Handler } from '@netlify/functions';
import { getSupabase } from './lib/auth';
import { ErrorCode, respondError } from './lib/errors';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Netlify build uses Stripe typings that may not include the chosen apiVersion
  // so we cast to any to avoid TS union mismatch while keeping runtime value.
  apiVersion: '2025-01-27.acacia' as any,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const signature = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) return respondError(ErrorCode.FORBIDDEN, 400, "Missing signature");

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body!, signature, webhookSecret);
  } catch (err: any) {
    return respondError(ErrorCode.FORBIDDEN, 400, `Webhook Signature Error: ${err.message}`);
  }

  // Protezione cross-environment
  const currentEnv = process.env.APP_ENV || 'development';
  const session = stripeEvent.data.object as any;
  const eventEnv = session.metadata?.app_env;

  if (eventEnv && eventEnv !== currentEnv) {
    return { statusCode: 200, body: JSON.stringify({ success: true, ignored: true }) };
  }

  const supabase = getSupabase();

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) throw new Error('Missing bookingId in metadata');

      // Chiamata RPC Idempotente: Gestisce internamente processed_stripe_events e atomicità
      const { data, error: rpcError } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_stripe_event_id: stripeEvent.id, // Usiamo l'ID evento globale di Stripe per idempotenza
        p_payment_intent_id: session.payment_intent as string,
        p_amount: session.amount_total
      });

      if (rpcError) {
        console.error(`[RPC Error] ${rpcError.message}`);
        // Restituiamo 500 per forzare Stripe al RETRY se l'errore è temporaneo (es. DB timeout)
        return { statusCode: 500, body: "Database transaction failed" };
      }

      console.log(`[Stripe Webhook] Booking ${bookingId} processato con successo: ${data.status}`);
    }

    return { 
      statusCode: 200, 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ success: true }) 
    };
  } catch (err: any) {
    console.error(`[Stripe Webhook Critical] Error: ${err.message}`);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};

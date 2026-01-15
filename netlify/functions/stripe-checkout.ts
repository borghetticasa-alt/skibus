
import { Handler } from '@netlify/functions';
import { authenticate, getSupabase } from './lib/auth';
import { checkRateLimit } from './lib/rate-limiter';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Netlify build uses Stripe typings that may not include the chosen apiVersion
  // so we cast to any to avoid TS union mismatch while keeping runtime value.
  apiVersion: '2025-01-27.acacia' as any,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { user } = await authenticate(event.headers.authorization);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  const isAllowed = await checkRateLimit(user.id, 'stripe-checkout', 3, 120);
  if (!isAllowed) return { statusCode: 429, body: JSON.stringify({ error: 'Troppi checkout avviati.' }) };

  const { bookingId } = JSON.parse(event.body || '{}');
  if (!bookingId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing bookingId' }) };

  const supabase = getSupabase();
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('*, trips(title, base_price)')
    .eq('id', bookingId)
    .single();

  if (bErr || !booking) return { statusCode: 404, body: JSON.stringify({ error: 'Booking not found' }) };

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `SkiBus: ${booking.trips.title}` },
          unit_amount: Math.round(booking.trips.base_price * 100),
        },
        quantity: booking.seats,
      }],
      mode: 'payment',
      success_url: `${process.env.URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/checkout?booking=${bookingId}&status=cancelled`,
      metadata: {
        bookingId: booking.id,
        userId: user.id,
        app_env: process.env.APP_ENV || 'development' // Protezione ambiente
      },
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

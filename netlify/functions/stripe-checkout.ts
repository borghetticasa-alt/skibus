
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

  // Supportiamo due flussi:
  // 1) legacy: { bookingId }
  // 2) completo: { tripId, busRunId, seats } -> crea seat_hold + booking pending e poi avvia checkout
  const body = JSON.parse(event.body || '{}');
  const bookingId: string | undefined = body.bookingId;
  const tripId: string | undefined = body.tripId;
  const busRunId: string | undefined = body.busRunId;
  const seats: number | undefined = body.seats;
  const attendees: any[] | undefined = body.attendees;

  const supabase = getSupabase();
  let finalBookingId = bookingId;

  // Se non ci passano bookingId, lo creiamo noi.
  if (!finalBookingId) {
    if (!tripId || !busRunId || !Number.isFinite(seats)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing bookingId or tripId/busRunId/seats' }) };
    }

    // Validazione partecipanti (richiesti)
    if (!Array.isArray(attendees) || attendees.length !== seats) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Attendees required and must match seats' }) };
    }
    for (let i = 0; i < attendees.length; i++) {
      const a = attendees[i] || {};
      if (!a.firstName || !a.lastName || !a.email || !a.phone) {
        return { statusCode: 400, body: JSON.stringify({ error: `Missing attendee fields at index ${i}` }) };
      }
    }

    // 1) crea seat hold atomico via RPC (già esistente)
    const { error: holdErr } = await supabase.rpc('create_secure_seat_hold', {
      p_user_id: user.id,
      p_bus_run_id: busRunId,
      p_seats: seats
    });
    if (holdErr) {
      return { statusCode: 409, body: JSON.stringify({ error: holdErr.message }) };
    }

    // 2) crea booking pending (colonne “safe”: se esistono)
    // Nota: se nel DB c'è una RPC dedicata, si può sostituire qui senza cambiare il client.
    const { data: created, error: cErr } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        trip_id: tripId,
        bus_run_id: busRunId,
        seats,
        status: 'pending'
      })
      .select('id')
      .single();

    if (cErr || !created?.id) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create booking' }) };
    }
    finalBookingId = created.id;

    // 3) salva partecipanti (richiede migrazione schema_attendees.sql)
    const attendeeRows = (attendees || []).map((a: any, idx: number) => ({
      booking_id: finalBookingId,
      idx: idx + 1,
      first_name: String(a.firstName || '').trim(),
      last_name: String(a.lastName || '').trim(),
      email: String(a.email || '').trim(),
      phone: String(a.phone || '').trim(),
    }));

    const { error: aErr } = await supabase.from('booking_attendees').insert(attendeeRows);
    if (aErr) {
      console.error('Failed to save attendees. Did you run schema_attendees.sql?', aErr);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save attendees. Run schema_attendees.sql on Supabase.' }) };
    }
  }

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('*, trips(title, base_price)')
    .eq('id', finalBookingId)
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
      cancel_url: `${process.env.URL}/checkout?booking=${finalBookingId}&status=cancelled`,
      metadata: {
        bookingId: booking.id,
        userId: user.id,
        app_env: process.env.APP_ENV || 'development' // Protezione ambiente
      },
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url, bookingId: booking.id }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

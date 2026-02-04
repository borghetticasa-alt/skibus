import { Handler } from "@netlify/functions";
import { authenticate, getSupabase } from "./lib/auth";
import { checkRateLimit } from "./lib/rate-limiter";
import { paypalRequest } from "./lib/paypal";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { user } = await authenticate(event.headers.authorization);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };

  const isAllowed = await checkRateLimit(user.id, "paypal-authorize-order", 6, 120);
  if (!isAllowed) return { statusCode: 429, body: JSON.stringify({ error: "Troppi tentativi PayPal." }) };

  const body = JSON.parse(event.body || "{}");
  const orderId: string | undefined = body.orderId;
  const bookingId: string | undefined = body.bookingId;

  if (!orderId || !bookingId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing orderId/bookingId" }) };
  }

  const supabase = getSupabase();

  // ✅ sicurezza minima: booking deve essere dell’utente
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, user_id, status")
    .eq("id", bookingId)
    .single();

  if (bErr || !booking?.id) {
    return { statusCode: 404, body: JSON.stringify({ error: "Booking not found" }) };
  }

  if (booking.user_id !== user.id) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }

  // ✅ 1) AUTHORIZE l’ordine (blocco)
  try {
    const auth = await paypalRequest<any>(`/v2/checkout/orders/${orderId}/authorize`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const pu = auth.purchase_units?.[0];
    const authorization = pu?.payments?.authorizations?.[0];

    const authorizationId = authorization?.id as string | undefined;
    const authStatus = authorization?.status as string | undefined;

    if (!authorizationId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing authorizationId from PayPal response" }),
      };
    }

    // ✅ 2) Salva authorization_id (best effort se colonne non esistono)
    try {
      await supabase
        .from("bookings")
        .update({
          paypal_order_id: orderId,
          paypal_authorization_id: authorizationId,
          payment_provider: "paypal",
          payment_status: "authorized", // NON pagato
          status: "pending", // resta pending finché non confermi la gita
        })
        .eq("id", bookingId);
    } catch (_) {
      // se non hai ancora le colonne, non blocchiamo la risposta
    }

    // ✅ 3) (Opzionale) log pagamento in tabella payments (se esiste)
    try {
      await supabase.from("payments").insert({
        booking_id: bookingId,
        provider: "paypal",
        provider_payment_id: authorizationId,
        status: "authorized",
        raw_json: auth,
      });
    } catch (_) {
      // ignore
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        orderId,
        bookingId,
        authorizationId,
        authorizationStatus: authStatus || null,
        note: "AUTHORIZED (funds held). Capture will happen when trip is confirmed.",
      }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

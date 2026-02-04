import { Handler } from "@netlify/functions";
import { authenticate, getSupabase } from "./lib/auth";
import { paypalRequest } from "./lib/paypal";

// Qui assumo che authenticate() identifichi un utente.
// La verifica "admin" la facciamo su profiles.role.
async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error) return false;
  return data?.role === "admin";
}

function eurosToCents(eur: string | number): number {
  const n = typeof eur === "string" ? Number(eur) : eur;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { user } = await authenticate(event.headers.authorization);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };

  const supabase = getSupabase();
  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) return { statusCode: 403, body: JSON.stringify({ error: "Admin only" }) };

  const body = JSON.parse(event.body || "{}");
  const bookingId: string | undefined = body.bookingId;
  const authorizationId: string | undefined = body.authorizationId;

  if (!bookingId && !authorizationId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing bookingId or authorizationId" }) };
  }

  // Se arriva bookingId, lo usiamo per recuperare authorizationId e validare stato
  let authId = authorizationId;

  if (bookingId) {
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, paypal_authorization_id, payment_status")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking?.id) return { statusCode: 404, body: JSON.stringify({ error: "Booking not found" }) };

    if (booking.payment_status !== "authorized") {
      return { statusCode: 409, body: JSON.stringify({ error: "Booking not in authorized state" }) };
    }

    authId = booking.paypal_authorization_id;
  }

  if (!authId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing paypal authorization id" }) };
  }

  // ✅ CAPTURE dell’autorizzazione (incasso)
  try {
    const capture = await paypalRequest<any>(`/v2/payments/authorizations/${authId}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const cap = capture?.id ? capture : capture?.payments?.captures?.[0];
    const captureId = (cap?.id as string | undefined) || undefined;
    const amountValue = (cap?.amount?.value as string | undefined) || (capture?.amount?.value as string | undefined);
    const amountCents = eurosToCents(amountValue || 0);

    if (!captureId) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing captureId from PayPal response" }) };
    }

    // Log pagamento (se esiste tabella)
    try {
      await supabase.from("payments").insert({
        booking_id: bookingId || null,
        provider: "paypal",
        provider_payment_id: captureId,
        status: "paid",
        amount_total: amountCents,
        raw_json: capture,
      });
    } catch (_) {}

    // ✅ Qui puoi riusare la tua RPC esistente per finalizzare booking e scalare posti ecc.
    // (la tua RPC era confirm_booking_payment)
    if (bookingId) {
      const { error: rpcError } = await supabase.rpc("confirm_booking_payment", {
        p_booking_id: bookingId,
        p_stripe_event_id: `paypal:capture:${captureId}`,
        p_payment_intent_id: captureId,
        p_amount: amountCents,
      });

      if (rpcError) {
        return { statusCode: 500, body: JSON.stringify({ error: "Database transaction failed" }) };
      }

      // best effort: aggiorna stato pagamento
      try {
        await supabase.from("bookings").update({ payment_status: "paid" }).eq("id", bookingId);
      } catch (_) {}
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, authorizationId: authId, captureId, amount: amountCents / 100 }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

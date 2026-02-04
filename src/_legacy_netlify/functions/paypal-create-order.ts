import { Handler } from "@netlify/functions";
import { authenticate, getSupabase } from "./lib/auth";
import { checkRateLimit } from "./lib/rate-limiter";
import { paypalRequest } from "./lib/paypal";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { user } = await authenticate(event.headers.authorization);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };

  const isAllowed = await checkRateLimit(user.id, "paypal-create-order", 3, 120);
  if (!isAllowed) return { statusCode: 429, body: JSON.stringify({ error: "Troppi ordini PayPal avviati." }) };

  const body = JSON.parse(event.body || "{}");
  const tripId: string | undefined = body.tripId;
  const busRunId: string | undefined = body.busRunId;
  const seats: number | undefined = body.seats;
  const attendees: any[] | undefined = body.attendees;

  // ✅ Validazione corretta parametri base
  if (!tripId || !busRunId || !Number.isFinite(seats) || Number(seats) <= 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing tripId/busRunId/seats" }) };
  }

  // ✅ Validazione partecipanti (richiesti, coerenti con seats)
  if (!Array.isArray(attendees) || attendees.length !== Number(seats)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Attendees required and must match seats" }) };
  }
  for (let i = 0; i < attendees.length; i++) {
    const a = attendees[i] || {};
    if (!a.firstName || !a.lastName || !a.email || !a.phone) {
      return { statusCode: 400, body: JSON.stringify({ error: `Missing attendee fields at index ${i}` }) };
    }
  }

  const supabase = getSupabase();

  // ✅ Enforce regola: PayPal SOLO se la gita NON è confermata
  // (se è confermata, deve passare da Stripe)
  const { data: tripRow, error: tErr } = await supabase
    .from("trips")
    .select("id, title, base_price, status")
    .eq("id", tripId)
    .single();

  if (tErr || !tripRow?.id) {
    return { statusCode: 404, body: JSON.stringify({ error: "Trip not found" }) };
  }

  // Qui adatta ai tuoi status reali: es. 'confirmed' / 'active'
  // Regola: se status === 'confirmed' => Stripe
  if (String(tripRow.status) === "confirmed") {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: "Trip confirmed: use Stripe checkout" }),
    };
  }

  // 1) seat hold (ok: blocca i posti)
  const { error: holdErr } = await supabase.rpc("create_secure_seat_hold", {
    p_user_id: user.id,
    p_bus_run_id: busRunId,
    p_seats: seats,
  });
  if (holdErr) {
    return { statusCode: 409, body: JSON.stringify({ error: holdErr.message }) };
  }

  // 2) booking pending
  const { data: created, error: cErr } = await supabase
    .from("bookings")
    .insert({
      user_id: user.id,
      trip_id: tripId,
      bus_run_id: busRunId,
      seats,
      status: "pending",
      payment_provider: "paypal",
      payment_status: "authorized_pending", // <- stato interno (non incassato)
    })
    .select("id")
    .single();

  if (cErr || !created?.id) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to create booking" }) };
  }

  // 3) salva partecipanti
  const attendeeRows = (attendees || []).map((a: any, idx: number) => ({
    booking_id: created.id,
    idx: idx + 1,
    first_name: String(a.firstName || "").trim(),
    last_name: String(a.lastName || "").trim(),
    email: String(a.email || "").trim(),
    phone: String(a.phone || "").trim(),
  }));

  const { error: aErr } = await supabase.from("booking_attendees").insert(attendeeRows);
  if (aErr) {
    console.error("Failed to save attendees. Did you run schema_attendees.sql?", aErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to save attendees. Run schema_attendees.sql on Supabase." }),
    };
  }

  const title = tripRow?.title || "SkiBus";
  const unitPrice = Number(tripRow?.base_price || 0);
  const total = Math.max(0, unitPrice * Number(seats));

  // ✅ 4) create PayPal order in AUTHORIZE mode (BLOCCO, non incasso)
  try {
    const baseUrl = process.env.URL; // Netlify env (esiste in produzione)
    if (!baseUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing process.env.URL" }) };
    }

    const order = await paypalRequest<any>("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [
          {
            custom_id: created.id, // bookingId
            description: `SkiBus: ${title}`,
            amount: {
              currency_code: "EUR",
              value: total.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: "EUR",
                  value: total.toFixed(2),
                },
              },
            },
            items: [
              {
                name: `SkiBus: ${title}`,
                unit_amount: { currency_code: "EUR", value: unitPrice.toFixed(2) },
                quantity: String(seats),
                category: "DIGITAL_GOODS",
              },
            ],
          },
        ],
        application_context: {
          brand_name: "SkiBus",
          shipping_preference: "NO_SHIPPING",
          user_action: "CONTINUE", // <- non "PAY_NOW" perché qui è authorizzazione
          return_url: `${baseUrl}/paypal/return?booking=${created.id}&provider=paypal`,
          cancel_url: `${baseUrl}/checkout?tripId=${encodeURIComponent(tripId)}&status=cancelled&provider=paypal`,
        },
      }),
    });

    // (opzionale ma utile) salva orderId su booking
    await supabase.from("bookings").update({ paypal_order_id: order.id }).eq("id", created.id);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        bookingId: created.id,
        approveLink: order.links?.find((l: any) => l.rel === "approve")?.href,
      }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

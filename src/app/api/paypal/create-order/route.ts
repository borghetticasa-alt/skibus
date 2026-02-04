import { NextResponse } from "next/server";
import { authenticate, getSupabase } from "@lib/auth";

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || req.headers.get("Authorization") || "";
}

function getBaseUrl(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function paypalApiBase() {
  const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!id || !secret) throw new Error("Missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET");

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error(json?.error_description || json?.message || "PayPal token error");

  return json.access_token as string;
}

function toNumericAmount(total: number) {
  // amount_total nel tuo DB è numeric: Supabase accetta number o string.
  // Uso string per evitare sorprese.
  return total.toFixed(2);
}

export async function POST(req: Request) {
  try {
    // 1) Auth (cliente loggato)
    const { user } = await authenticate(getAuthHeader(req));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2) Body
    const body = await req.json().catch(() => ({}));
    const tripId = String(body.tripId || "").trim();
    const busRunId = String(body.busRunId || "").trim(); // opzionale (per ora, solo per tornare al checkout)
    const seats = Number(body.seats || 0);

    if (!tripId || !Number.isFinite(seats) || seats <= 0) {
      return NextResponse.json({ error: "Missing tripId/seats" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 3) Carica trip (prezzo base + data)
    const { data: trip, error: tErr } = await supabase
      .from("trips")
      .select("id, title, destination, base_price, trip_date")
      .eq("id", tripId)
      .single();

    if (tErr || !trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const unit = Number(trip.base_price || 0);
    const total = Math.max(0, unit * seats);
    if (total <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    // 4) Crea booking "pending" usando SOLO colonne che esistono nel tuo schema reale
    //    Nota: nel tuo schema NON c'è user_id né trip_id, quindi non li scriviamo.
    const insertPayload: Record<string, any> = {
      trip_date: trip.trip_date ?? null,
      participants: seats, // smallint nel tuo schema
      seats,               // integer not null default 1 (esiste)
      amount_total: toNumericAmount(total), // numeric
      payment_provider: "paypal",
      payment_status: "created",            // created -> authorized -> captured
      booking_status: "pending",            // se lo usi lato gestione
      status: "pending",                    // colonna status che hai
      provider: "paypal_authorize",         // colonna provider che hai
      // full_name/email/phone: li compilerai dal form cliente quando lo mettiamo (ora non li abbiamo qui)
    };

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert(insertPayload)
      .select("id")
      .single();

    if (bErr || !booking?.id) {
      return NextResponse.json({ error: bErr?.message || "Failed to create booking" }, { status: 500 });
    }

    // 5) PayPal: crea Order con intent AUTHORIZE (blocca fondi)
    const token = await paypalAccessToken();
    const baseUrl = getBaseUrl(req);

    const orderRes = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [
          {
            custom_id: booking.id, // bookingId
            description: `SkiBus: ${trip.destination || trip.title || "Gita"}`,
            amount: { currency_code: "EUR", value: total.toFixed(2) },
          },
        ],
        application_context: {
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: `${baseUrl}/paypal/return?bookingId=${encodeURIComponent(booking.id)}`,
          cancel_url: `${baseUrl}/checkout?tripId=${encodeURIComponent(tripId)}${
            busRunId ? `&busRunId=${encodeURIComponent(busRunId)}` : ""
          }&provider=paypal&status=cancelled&bookingId=${encodeURIComponent(booking.id)}`,
        },
      }),
    });

    const orderJson = await orderRes.json().catch(() => ({} as any));

    if (!orderRes.ok) {
      console.error("[paypal/create-order] PayPal order error:", orderJson);

      // Best effort: marchiamo la booking come failed
      try {
        await supabase
          .from("bookings")
          .update({ payment_status: "failed", booking_status: "failed", status: "failed" })
          .eq("id", booking.id);
      } catch {}

      return NextResponse.json(
        { error: orderJson?.message || "PayPal order error", raw: orderJson },
        { status: 500 }
      );
    }

    const approveLink = orderJson?.links?.find((l: any) => l.rel === "approve")?.href;
    if (!approveLink) {
      return NextResponse.json({ error: "Missing approve link from PayPal" }, { status: 500 });
    }

    // Salva orderId su DB (colonna esiste)
    try {
      await supabase
        .from("bookings")
        .update({ paypal_order_id: orderJson.id, payment_status: "created" })
        .eq("id", booking.id);
    } catch (e: any) {
      console.warn("[paypal/create-order] Could not persist paypal_order_id:", e?.message);
    }

    return NextResponse.json(
      { orderId: orderJson.id, bookingId: booking.id, approveLink },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[paypal/create-order] ERROR", e);
    return NextResponse.json(
      {
        error: e?.message || "Server error",
        hint: "Controlla PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_MODE in .env.local e riavvia npm run dev.",
      },
      { status: 500 }
    );
  }
}
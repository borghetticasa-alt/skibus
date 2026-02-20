import { NextResponse } from "next/server";
import Stripe from "stripe";
import { authenticate } from "@lib/auth";

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || req.headers.get("Authorization") || "";
}

function getBaseUrl(req: Request) {
  // robusto su Vercel e in locale
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    // 1) auth: serve user loggato (cliente)
    const { user } = await authenticate(getAuthHeader(req));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2) body
    const body = await req.json().catch(() => ({}));
    const tripId = String(body.tripId || "").trim();
    const busRunId = String(body.busRunId || "").trim();
    const seats = Number(body.seats || 1);

    if (!tripId || !Number.isFinite(seats) || seats <= 0) {
      return NextResponse.json({ error: "Missing tripId/seats" }, { status: 400 });
    }

    // 3) Stripe init
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

    const stripe = new Stripe(secret);

    // 4) Qui per ora prezzo “semplice” (MVP):
    //    - prendi base_price dal DB trips
    //    - totale = base_price * seats
    //    Se non vuoi DB ora, metti cifra fissa temporanea.
    //
    // IMPORTANT: per usare DB qui servirebbe getSupabase() e select su trips.
    // Io lo faccio già: così è “vero”.
    const { getSupabase } = await import("@lib/auth");
    const supabase = getSupabase();

    const { data: trip, error: tErr } = await supabase
      .from("trips")
      .select("id, title, destination, base_price")
      .eq("id", tripId)
      .single();

    if (tErr || !trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const unit = Number(trip.base_price || 0);
    const amount = Math.max(0, Math.round(unit * seats * 100)); // cents
    if (amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const baseUrl = getBaseUrl(req);

    // 5) session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/account?paid=1&tripId=${encodeURIComponent(tripId)}`,
      cancel_url: `${baseUrl}/checkout?tripId=${encodeURIComponent(tripId)}&busRunId=${encodeURIComponent(busRunId)}&cancel=1`,
      metadata: {
        tripId,
        busRunId,
        userId: user.id,
        seats: String(seats),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amount,
            product_data: {
              name: `SkiBus: ${trip.destination || trip.title || "Gita"}`,
            },
          },
        },
      ],
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

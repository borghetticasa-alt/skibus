import { NextResponse } from "next/server";
import { authenticate, checkAdmin, getSupabase } from "@lib/auth";

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || req.headers.get("Authorization") || "";
}

async function requireAdmin(req: Request) {
  const { user } = await authenticate(getAuthHeader(req));
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const isAdmin = await checkAdmin(user.id);
  if (!isAdmin) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, user };
}

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, trip_date, status, base_price, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] }, { status: 200 });
}

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));

  const title = String(body.title || "Nuova gita");
  const destination = String(body.destination || title);
  const basePrice = typeof body.basePrice === "number" ? body.basePrice : 0;
  const tripDate = body.tripDate || null;

  const { data, error } = await supabase
    .from("trips")
    .insert({
      title,
      destination,
      base_price: basePrice,
      trip_date: tripDate,
      status: "active",
    })
    .select("id, title, destination, trip_date, status, base_price")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));

  const tripId = String(body.tripId || "");
  const nextStatus = String(body.status || "").trim();

  if (!tripId) return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
  if (!nextStatus) return NextResponse.json({ error: "Missing status" }, { status: 400 });

  // 1) aggiorna stato gita
  const { data: updatedTrip, error: tErr } = await supabase
    .from("trips")
    .update({ status: nextStatus })
    .eq("id", tripId)
    .select("id, status")
    .single();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // 2) se diventa CONFIRMED -> cattura PayPal per tutte le prenotazioni autorizzate
  if (nextStatus === "confirmed") {
    // prendo bookings autorizzati
    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("id, paypal_authorization_id, payment_status, payment_provider")
      .eq("trip_id", tripId)
      .eq("payment_provider", "paypal")
      .eq("payment_status", "authorized");

    if (bErr) {
      return NextResponse.json(
        { error: "Trip status updated, but failed to load authorized bookings", detail: bErr.message },
        { status: 500 }
      );
    }

    // se non ci sono bookings da catturare -> ok
    const list = bookings || [];
    const results: any[] = [];

    for (const bk of list) {
      const authId = String((bk as any).paypal_authorization_id || "");
      if (!authId) {
        results.push({ bookingId: bk.id, ok: false, error: "Missing paypal_authorization_id" });
        continue;
      }

      // chiama la Netlify function che fa capture dell’autorizzazione
      // NB: usa URL assoluto dal server
      const baseUrl =
        req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
          ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
          : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      try {
        const res = await fetch(`${baseUrl}/.netlify/functions/paypal-capture-authorization`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // passiamo auth admin anche alla function (che verifica admin)
            Authorization: getAuthHeader(req),
          },
          body: JSON.stringify({ bookingId: bk.id, authorizationId: authId }),
        });

        const json = await res.json().catch(() => ({} as any));
        if (!res.ok || !json?.success) {
          results.push({ bookingId: bk.id, ok: false, error: json?.error || `HTTP ${res.status}` });
        } else {
          results.push({ bookingId: bk.id, ok: true, captureId: json.captureId });
        }
      } catch (e: any) {
        results.push({ bookingId: bk.id, ok: false, error: e?.message || "Capture error" });
      }
    }

    // Se vuoi: se anche una capture fallisce, puoi decidere se bloccare o meno.
    // Qui: ritorno 200 ma con report (così admin vede cosa non è andato).
    return NextResponse.json(
      { data: updatedTrip, captureReport: results },
      { status: 200 }
    );
  }

  return NextResponse.json({ data: updatedTrip }, { status: 200 });
}

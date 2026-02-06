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

  const title = String(body.title || "Nuova gita").trim();
  const destination = String(body.destination || title).trim();
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

  const tripId = String(body.tripId || "").trim();
  const nextStatus = String(body.status || "").trim();

  if (!tripId) return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
  if (!nextStatus) return NextResponse.json({ error: "Missing status" }, { status: 400 });

  const { data: updatedTrip, error: tErr } = await supabase
    .from("trips")
    .update({ status: nextStatus })
    .eq("id", tripId)
    .select("id, status")
    .single();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // NOTE: capture PayPal autorizzazioni -> lo rimettiamo come route Next separata (niente Netlify).
  return NextResponse.json({ data: updatedTrip }, { status: 200 });
}
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

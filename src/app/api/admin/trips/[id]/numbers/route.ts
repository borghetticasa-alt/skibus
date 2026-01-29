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

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const tripId = ctx.params.id;
  const supabase = getSupabase();

  const [{ data: numbers }, { data: services }, { data: internalCosts }] = await Promise.all([
    supabase.from("trip_numbers").select("*").eq("trip_id", tripId).maybeSingle(),
    supabase.from("trip_services").select("*").eq("trip_id", tripId).order("sort", { ascending: true }),
    supabase.from("trip_internal_costs").select("*").eq("trip_id", tripId).order("sort", { ascending: true }),
  ]);

  return NextResponse.json({
    tripId,
    numbers: numbers || null,
    services: services || [],
    internalCosts: internalCosts || [],
  });
}

type SaveBody = {
  busId?: string;
  capacity?: number;
  busCostTotal?: number;

  baseSalePrice?: number;
  baseCostPrice?: number;

  paypalFeePercent?: number;
  paypalFeeFixed?: number;
  stripeFeePercent?: number;
  stripeFeeFixed?: number;

  services?: Array<{
    id?: string;
    name: string;
    pricing_mode?: string;
    sale_price?: number;
    cost_price?: number;
    options?: any;
    is_active?: boolean;
    sort?: number;
  }>;

  internalCosts?: Array<{
    id?: string;
    name: string;
    cost_mode?: string;
    amount?: number;
    is_active?: boolean;
    sort?: number;
  }>;
};

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const tripId = ctx.params.id;
  const supabase = getSupabase();

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Upsert trip_numbers
  const numbersRow = {
    trip_id: tripId,
    bus_id: body.busId ?? null,
    capacity: Number(body.capacity ?? 0),
    bus_cost_total: Number(body.busCostTotal ?? 0),

    base_sale_price: Number(body.baseSalePrice ?? 0),
    base_cost_price: Number(body.baseCostPrice ?? 0),

    paypal_fee_percent: Number(body.paypalFeePercent ?? 0),
    paypal_fee_fixed: Number(body.paypalFeeFixed ?? 0),
    stripe_fee_percent: Number(body.stripeFeePercent ?? 0),
    stripe_fee_fixed: Number(body.stripeFeeFixed ?? 0),

    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase.from("trip_numbers").upsert(numbersRow, { onConflict: "trip_id" });
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // Services: simple replace strategy (delete + insert) for now (safe and predictable in admin tool)
  if (Array.isArray(body.services)) {
    const { error: delErr } = await supabase.from("trip_services").delete().eq("trip_id", tripId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const toInsert = body.services.map((s, i) => ({
      trip_id: tripId,
      name: s.name,
      pricing_mode: s.pricing_mode || "per_person",
      sale_price: Number(s.sale_price ?? 0),
      cost_price: Number(s.cost_price ?? 0),
      options: s.options ?? null,
      is_active: s.is_active ?? true,
      sort: Number(s.sort ?? (i + 1) * 10),
    }));

    if (toInsert.length) {
      const { error: insErr } = await supabase.from("trip_services").insert(toInsert);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  // Internal costs: replace strategy
  if (Array.isArray(body.internalCosts)) {
    const { error: delErr2 } = await supabase.from("trip_internal_costs").delete().eq("trip_id", tripId);
    if (delErr2) return NextResponse.json({ error: delErr2.message }, { status: 500 });

    const toInsert2 = body.internalCosts.map((c, i) => ({
      trip_id: tripId,
      name: c.name,
      cost_mode: c.cost_mode || "fixed",
      amount: Number(c.amount ?? 0),
      is_active: c.is_active ?? true,
      sort: Number(c.sort ?? (i + 1) * 10),
    }));

    if (toInsert2.length) {
      const { error: insErr2 } = await supabase.from("trip_internal_costs").insert(toInsert2);
      if (insErr2) return NextResponse.json({ error: insErr2.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

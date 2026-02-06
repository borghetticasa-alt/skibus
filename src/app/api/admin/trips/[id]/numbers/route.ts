// src/app/api/admin/trips/[id]/numbers/route.ts
import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id: tripId } = await ctx.params;
  const supabase = getSupabase();

  const [numbersRes, servicesRes, internalCostsRes] = await Promise.all([
    supabase.from("trip_numbers").select("*").eq("trip_id", tripId).maybeSingle(),
    supabase.from("trip_services").select("*").eq("trip_id", tripId).order("sort", { ascending: true }),
    supabase.from("trip_internal_costs").select("*").eq("trip_id", tripId).order("sort", { ascending: true }),
  ]);

  if (numbersRes.error) return NextResponse.json({ error: numbersRes.error.message }, { status: 500 });
  if (servicesRes.error) return NextResponse.json({ error: servicesRes.error.message }, { status: 500 });
  if (internalCostsRes.error) return NextResponse.json({ error: internalCostsRes.error.message }, { status: 500 });

  return NextResponse.json({
    tripId,
    numbers: numbersRes.data || null,
    services: servicesRes.data || [],
    internalCosts: internalCostsRes.data || [],
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
    name: string;
    description?: string;
    pricing_mode?: string;
    sale_price?: number;
    cost_price?: number;
    qty?: number;
    options?: any;
    selected_option_id?: string | null;
    visible_to_user?: boolean;
    is_required?: boolean;
    is_active?: boolean;
    sort?: number;
  }>;

  internalCosts?: Array<{
    name: string;
    cost_mode?: string;
    amount?: number;
    is_active?: boolean;
    sort?: number;
  }>;
};

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id: tripId } = await ctx.params;
  const supabase = getSupabase();

  let body: SaveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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

  if (Array.isArray(body.services)) {
    const { error: delErr } = await supabase.from("trip_services").delete().eq("trip_id", tripId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const toInsert = body.services.map((s, i) => ({
      trip_id: tripId,
      name: s.name,
      description: s.description || "",
      pricing_mode: s.pricing_mode || "per_person",
      sale_price: Number(s.sale_price ?? 0),
      cost_price: Number(s.cost_price ?? 0),
      qty: Number(s.qty ?? 0),
      options: s.options ?? null,
      selected_option_id: s.selected_option_id ?? null,
      visible_to_user: s.visible_to_user ?? true,
      is_required: s.is_required ?? false,
      is_active: s.is_active ?? true,
      sort: Number(s.sort ?? (i + 1) * 10),
    }));

    if (toInsert.length) {
      const { error: insErr } = await supabase.from("trip_services").insert(toInsert);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  if (Array.isArray(body.internalCosts)) {
    const { error: delErr } = await supabase.from("trip_internal_costs").delete().eq("trip_id", tripId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const toInsert = body.internalCosts.map((c, i) => ({
      trip_id: tripId,
      name: c.name,
      cost_mode: c.cost_mode || "fixed",
      amount: Number(c.amount ?? 0),
      is_active: c.is_active ?? true,
      sort: Number(c.sort ?? (i + 1) * 10),
    }));

    if (toInsert.length) {
      const { error: insErr } = await supabase.from("trip_internal_costs").insert(toInsert);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, tripId });
}
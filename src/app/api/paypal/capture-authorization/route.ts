// src/app/api/paypal/capture-authorization/route.ts
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

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const bookingId = String(body.bookingId || "");
  const authorizationId = String(body.authorizationId || "");
  if (!bookingId || !authorizationId) {
    return NextResponse.json({ error: "Missing bookingId or authorizationId" }, { status: 400 });
  }

  // TODO: qui dentro ci va la tua call PayPal reale per CAPTURE authorizationId
  // Per ora: simulazione success
  const capJson: any = { id: `CAP_${Date.now()}` };

  const captureId =
    capJson?.id ||
    capJson?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
    null;

  if (!captureId) return NextResponse.json({ error: "Capture failed" }, { status: 500 });

  const supabase = getSupabase();
  const { error: upErr } = await supabase
    .from("bookings")
    .update({
      payment_status: "captured",
      paypal_capture_id: captureId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ success: true, captureId }, { status: 200 });
}
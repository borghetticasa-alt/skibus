import { NextResponse } from "next/server";
import { getSupabase } from "@lib/auth";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, trip_date, status, base_price, created_at")
    .order("trip_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] }, { status: 200 });
}

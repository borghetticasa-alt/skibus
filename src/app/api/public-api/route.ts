import { NextResponse } from "next/server";
import { getSupabase } from "@lib/auth";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("trips").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

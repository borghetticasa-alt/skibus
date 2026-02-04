import { NextResponse } from "next/server";
import { getSupabase } from "@lib/auth";

export async function GET(req: Request) {
  const supabase = getSupabase();
  const url = new URL(req.url);

  // accetta sia ?id= che ?tripId=
  const id = url.searchParams.get("id") || url.searchParams.get("tripId");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // 🔒 SOLO campi pubblici/minimi (niente *)
  const { data, error } = await supabase
    .from("trips")
    .select("id,title,destination,trip_date,status,base_price")
    .eq("id", id)
    .single();

  if (error) {
    const msg = error.message || "Not found";
    const status = msg.toLowerCase().includes("0 rows") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  // normalizziamo l’output per il frontend cliente
  const publicTrip = {
    id: data.id,
    title: data.title,
    destination: data.destination,
    tripDate: data.trip_date,
    status: data.status,
    price: data.base_price,
  };

  return NextResponse.json(
    { status: "success", data: publicTrip },
    { status: 200 }
  );
}

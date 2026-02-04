
import { Config } from "@netlify/functions";
import { getSupabase } from "./lib/auth";
import { evaluateTrip } from "../../src/services/decision-engine";

export default async (req: Request) => {
  const supabase = getSupabase();
  
  // 1. Esegue la pulizia in SQL e ottiene solo i trip_id che hanno avuto cambiamenti
  // Limitiamo a 50 trip per esecuzione per stare nei limiti di timeout delle functions
  const { data: affectedTrips, error: rpcError } = await supabase.rpc('expire_seat_holds_batch', {
    p_limit: 200 
  });

  if (rpcError) {
    console.error("RPC expire_seat_holds_batch failed:", rpcError);
    return new Response("Internal Server Error", { status: 500 });
  }

  if (!affectedTrips || affectedTrips.length === 0) {
    return new Response("No expired holds to process.");
  }

  // 2. Re-valuta i trip impattati (batch limitato per sicurezza timeout)
  const results = [];
  for (const row of affectedTrips) {
    try {
      // evaluateTrip gestisce internamente log e notifiche se necessario
      await evaluateTrip(row.trip_id, false);
      results.push({ id: row.trip_id, status: 'ok' });
    } catch (e: any) {
      console.error(`Re-evaluation failed for ${row.trip_id}:`, e.message);
      results.push({ id: row.trip_id, status: 'error', error: e.message });
    }
  }

  return new Response(JSON.stringify({
    processed_trips: affectedTrips.length,
    details: results
  }), { headers: { "Content-Type": "application/json" } });
};

export const config: Config = {
  schedule: "*/5 * * * *" 
};

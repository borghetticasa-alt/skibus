
import { Config } from "@netlify/functions";
import { getSupabase } from "./lib/auth";

export default async (req: Request) => {
  const supabase = getSupabase();
  
  console.log("[Cleanup] Avvio scansione booking orfani...");

  // Eseguiamo la pulizia dei booking pending creati da più di 45 minuti
  // che non hanno un corrispondente seat_hold attivo.
  const { data, error } = await supabase.rpc('expire_orphan_bookings', {
    p_timeout_minutes: 45
  });

  if (error) {
    console.error("[Cleanup Error]", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const count = data?.[0]?.expired_count || 0;
  console.log(`[Cleanup Success] Marcatura 'expired' completata per ${count} booking.`);

  return new Response(JSON.stringify({ 
    success: true, 
    expired_bookings: count 
  }), {
    headers: { "Content-Type": "application/json" }
  });
};

export const config: Config = {
  // Esecuzione ogni ora al minuto 0
  schedule: "0 * * * *"
};

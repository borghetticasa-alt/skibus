
import { Config } from "@netlify/functions";
import { getSupabase } from "./lib/auth";

export default async (req: Request) => {
  const supabase = getSupabase();
  const runDate = new Date().toISOString().split('T')[0];

  // Deleghiamo tutta l'aggregazione a Postgres per performance e consistenza
  const { error } = await supabase.rpc('kpi_daily_rollup', {
    p_run_date: runDate
  });

  if (error) {
    console.error("KPI Rollup RPC Error:", error);
    return new Response("Rollup execution failed", { status: 500 });
  }

  return new Response(`KPI Rollup successfully triggered for ${runDate}`);
};

export const config: Config = {
  schedule: "0 2 * * *" 
};

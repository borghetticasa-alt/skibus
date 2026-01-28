import { Handler } from '@netlify/functions';
import { getSupabase } from './lib/auth';

/**
 * Ritorna disponibilità posti per una specifica bus_run.
 * Sicuro da esporre pubblicamente: NON ritorna dati personali, solo contatori.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const busRunId = event.queryStringParameters?.busRunId;
  if (!busRunId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing busRunId' }) };

  const supabase = getSupabase();

  // 1) capacity
  const { data: busRun, error: bErr } = await supabase
    .from('bus_runs')
    .select('id, capacity')
    .eq('id', busRunId)
    .single();

  if (bErr || !busRun) return { statusCode: 404, body: JSON.stringify({ error: 'Bus run not found' }) };

  const capacity = Number(busRun.capacity ?? 0);

  // 2) sold seats (paid)
  const { data: paidBookings, error: pErr } = await supabase
    .from('bookings')
    .select('seats')
    .eq('bus_run_id', busRunId)
    .eq('status', 'paid');

  if (pErr) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load bookings' }) };

  const sold = (paidBookings || []).reduce((acc: number, b: any) => acc + Number(b.seats || 0), 0);

  // 3) held seats (active seat_holds)
  const nowIso = new Date().toISOString();
  const { data: holds, error: hErr } = await supabase
    .from('seat_holds')
    .select('seats')
    .eq('bus_run_id', busRunId)
    .gt('expires_at', nowIso);

  if (hErr) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load seat holds' }) };

  const held = (holds || []).reduce((acc: number, h: any) => acc + Number(h.seats || 0), 0);

  const available = Math.max(0, capacity - sold - held);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ busRunId, capacity, sold, held, available, asOf: nowIso }),
  };
};

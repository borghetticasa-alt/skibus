import { getDbClient } from '@/lib/supabase/db';
import { evaluateTrip as evaluateTripCore, type EvaluateTripInput, type TripDecision } from './decision-engine';

/**
 * Server-side wrapper used by Netlify Functions.
 * Carica dal DB i numeri minimi (partecipanti/capienza/costi) e invoca il decision engine puro.
 */
export async function evaluateTrip(tripId: string, _emitNotifications: boolean = false): Promise<TripDecision> {
  const supabase = getDbClient();

  // Trip + numbers (se non esistono non deve crashare)
  const [{ data: trip, error: tripErr }, { data: numbers }] = await Promise.all([
    supabase.from('trips').select('id, base_price, departure_at, title').eq('id', tripId).single(),
    supabase.from('trip_numbers').select('*').eq('trip_id', tripId).maybeSingle(),
  ]);
  if (tripErr) throw tripErr;

  // Latest bus run (capacity)
  const { data: busRun, error: busErr } = await supabase
    .from('bus_runs')
    .select('id, capacity, status')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (busErr) throw busErr;

  const busRunId = busRun?.id as string | undefined;

  // Seats paid + active holds
  let participants = 0;
  if (busRunId) {
    const { data: paid, error: paidErr } = await supabase
      .from('bookings')
      .select('seats')
      .eq('bus_run_id', busRunId)
      .eq('status', 'PAID');
    if (paidErr) throw paidErr;
    participants = (paid || []).reduce((a: number, r: any) => a + (Number(r.seats) || 0), 0);
  }

  const capacity = Number(numbers?.capacity || busRun?.capacity || 0);

  // Stima economica minimale: ricavi = base_price * pagati, costi = bus_cost_total + fixed extras (se presenti)
  const basePrice = Number(numbers?.base_sale_price || trip?.base_price || 0);
  const revenueEUR = basePrice * participants;

  const busCostTotal = Number(numbers?.bus_cost_total || 0);
  const extrasFixed = Number(numbers?.extras_fixed_cost || 0);
  const costEUR = busCostTotal + extrasFixed;

  const input: EvaluateTripInput = {
    tripId,
    participants,
    capacity,
    groupThreshold: Number(numbers?.group_threshold || 21),
    targetMarginEUR: Number(numbers?.target_margin || 0) || undefined,
    revenueEUR,
    costEUR,
    departureAtISO: (trip as any)?.departure_at || undefined,
    notifyAgencyHoursBefore: Number(numbers?.notify_agency_hours_before || 48),
  };

  return evaluateTripCore(input);
}

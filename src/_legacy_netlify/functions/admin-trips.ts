import { Handler } from '@netlify/functions';
import { authenticate, checkAdmin, getSupabase } from './lib/auth';
import { z } from 'zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};


const CreateTripSchema = z.object({
  title: z.string().min(3),
  destination: z.string().optional(),
  tripDate: z.string().optional(), // ISO yyyy-mm-dd
  basePrice: z.number().positive(),
  capacity: z.number().int().positive().default(49),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  const authHeader = (event.headers?.authorization as any) || (event.headers?.Authorization as any);
  const { user } = await authenticate(authHeader);
  if (!user || !(await checkAdmin(user.id))) {
    return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const supabase = getSupabase();

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('trips')
      .select('id, title, destination, trip_date, status, base_price, created_at')
      .order('created_at', { ascending: false });

    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: data || [] }) };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const validated = CreateTripSchema.parse(body);

    // 1) create trip
    const { data: createdTrip, error: tErr } = await supabase
      .from('trips')
      .insert({
        title: validated.title,
        destination: validated.destination || validated.title,
        trip_date: validated.tripDate || null,
        status: 'active',
        base_price: validated.basePrice,
      })
      .select('id, title, destination, trip_date, status, base_price')
      .single();

    if (tErr || !createdTrip?.id) {
      return { statusCode: 500, body: JSON.stringify({ error: tErr?.message || 'Failed to create trip' }) };
    }

    // 2) create initial bus_run
    const { data: createdBus, error: bErr } = await supabase
      .from('bus_runs')
      .insert({
        trip_id: createdTrip.id,
        status: 'open',
        capacity: validated.capacity,
      })
      .select('id, capacity, status')
      .single();

    if (bErr || !createdBus?.id) {
      // trip already created; return trip but warn about bus run
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ trip: createdTrip, busRun: null, warning: bErr?.message || 'Bus run not created' }) };
    }

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ trip: createdTrip, busRun: createdBus }) };
  }

  if (event.httpMethod === 'PATCH') {
    const body = JSON.parse(event.body || '{}');
    const tripId = String(body.tripId || '');
    const busRunId = String(body.busRunId || '');
    const patch: any = {};
    if (typeof body.basePrice === 'number') patch.base_price = body.basePrice;
    if (typeof body.title === 'string' && body.title.trim().length >= 3) patch.title = body.title.trim();
    if (typeof body.destination === 'string' && body.destination.trim().length >= 2) patch.destination = body.destination.trim();
    if ('tripDate' in body) patch.trip_date = body.tripDate || null;

    if (!tripId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing tripId' }) };

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('trips').update(patch).eq('id', tripId);
      if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    if (busRunId) {
      const busPatch: any = {};
      if (typeof body.capacity === 'number') busPatch.capacity = body.capacity;
      if (typeof body.busStatus === 'string') busPatch.status = body.busStatus;
      if (Object.keys(busPatch).length > 0) {
        const { error } = await supabase.from('bus_runs').update(busPatch).eq('id', busRunId);
        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }
    }

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  return {
    statusCode: 405,
    headers: corsHeaders, body: 'Method Not Allowed'
  };
};
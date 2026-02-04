import { Handler } from '@netlify/functions';
import { getSupabase } from './lib/auth';
import { requireAuth } from './lib/requireAuth';

/**
 * Salva URL skirama + query meteo per una gita.
 * Upload file avviene dal client su Supabase Storage; qui registriamo solo i metadati.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const auth = await requireAuth(event);
  if (!auth.ok) return { statusCode: auth.statusCode, body: JSON.stringify({ error: auth.error }) };

  const body = event.body ? JSON.parse(event.body) : {};
  const tripId = body.tripId as string | undefined;
  const skiramaUrl = body.skiramaUrl as string | undefined;
  const weatherQuery = body.weatherQuery as string | undefined;

  if (!tripId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing tripId' }) };
  if (!skiramaUrl && !weatherQuery) return { statusCode: 400, body: JSON.stringify({ error: 'Nothing to update' }) };

  const supabase = getSupabase();

  const payload: any = { trip_id: tripId, updated_at: new Date().toISOString() };
  if (typeof skiramaUrl === 'string') payload.skirama_url = skiramaUrl;
  if (typeof weatherQuery === 'string') payload.weather_query = weatherQuery;

  const { data, error } = await supabase
    .from('trip_media')
    .upsert(payload, { onConflict: 'trip_id' })
    .select('trip_id, skirama_url, weather_query, updated_at')
    .single();

  if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save trip media' }) };

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
};

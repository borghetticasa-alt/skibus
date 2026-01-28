import { Handler } from '@netlify/functions';
import { getSupabase } from './lib/auth';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const tripId = event.queryStringParameters?.tripId;
  if (!tripId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing tripId' }) };

  const supabase = getSupabase();
  const { data, error } = await supabase.from('trip_media').select('trip_id, skirama_url, weather_query, updated_at').eq('trip_id', tripId).maybeSingle();

  if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load trip media' }) };
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || null) };
};

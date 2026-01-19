
import { Handler } from '@netlify/functions';
import { getSupabase } from './lib/auth';

export const handler: Handler = async (event) => {
  const supabase = getSupabase();
  const path = event.path.split('/').pop();

  if (path === 'get-trips') {
    const { data } = await supabase.from('trips').select('*').eq('status', 'active');
    return { statusCode: 200, body: JSON.stringify({ status: 'success', data }) };
  }

  if (path === 'get-trip-detail') {
    const tripId = event.queryStringParameters?.id;
    const { data } = await supabase.from('trips').select('*, bus_runs(*)').eq('id', tripId).single();
    return { statusCode: 200, body: JSON.stringify({ status: 'success', data }) };
  }

  return { statusCode: 404, body: 'Not Found' };
};

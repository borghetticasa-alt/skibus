
import { Handler } from '@netlify/functions';
import { getSupabase } from './lib/auth';

export const handler: Handler = async (event) => {
  const supabase = getSupabase();
  const path = event.path.split('/').pop();

  if (path === 'get-trips') {
    const { data, error } = await supabase
      .from('trips')
      .select('id, title, destination, trip_date, status, base_price, bus_runs(id, capacity, status)')
      .eq('status', 'active')
      .order('trip_date', { ascending: true });
    if (error) return { statusCode: 500, body: JSON.stringify({ status: 'error', error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ status: 'success', data }) };
  }

  if (path === 'get-trip-detail') {
    const tripId = event.queryStringParameters?.id;
    const { data } = await supabase.from('trips').select('*, bus_runs(*)').eq('id', tripId).single();
    return { statusCode: 200, body: JSON.stringify({ status: 'success', data }) };
  }

  return { statusCode: 404, body: 'Not Found' };
};

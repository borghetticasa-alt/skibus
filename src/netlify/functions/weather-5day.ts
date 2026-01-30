import { Handler } from '@netlify/functions';

/**
 * Meteo 5 giorni via Open-Meteo (geocoding + forecast).
 * Input: q (es. "Champoluc" / "Gressoney" / "Alagna")
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const q = event.queryStringParameters?.q;
  if (!q) return { statusCode: 400, body: JSON.stringify({ error: 'Missing q' }) };

  try {
    // 1) Geocoding
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=it&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) return { statusCode: 502, body: JSON.stringify({ error: 'Geocoding failed' }) };
    const geo = await geoRes.json() as any;
    const first = geo?.results?.[0];
    if (!first) return { statusCode: 404, body: JSON.stringify({ error: 'Location not found' }) };

    const lat = first.latitude;
    const lon = first.longitude;

    // 2) Forecast 5 giorni
    const fUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Europe%2FRome&forecast_days=5`;
    const fRes = await fetch(fUrl);
    if (!fRes.ok) return { statusCode: 502, body: JSON.stringify({ error: 'Forecast failed' }) };
    const fc = await fRes.json() as any;

    const out = (fc?.daily?.time || []).map((date: string, i: number) => ({
      date,
      tMax: fc.daily.temperature_2m_max?.[i],
      tMin: fc.daily.temperature_2m_min?.[i],
      precipProb: fc.daily.precipitation_probability_max?.[i],
      weatherCode: fc.daily.weathercode?.[i],
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: q,
        place: { name: first.name, country: first.country, admin1: first.admin1, latitude: lat, longitude: lon },
        days: out,
      }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error', detail: e?.message }) };
  }
};

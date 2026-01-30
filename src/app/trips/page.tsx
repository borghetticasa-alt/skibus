'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchJson } from '@/lib/netlifyFunctions'; // se vuoi poi lo spostiamo su /api

type Trip = {
  id: string;
  title: string;
  destination?: string;
  date?: string;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadTrips() {
      try {
        setError(null);
        setLoading(true);

        const data = await fetchJson('/.netlify/functions/public-api/get-trips');

        if (!alive) return;

        if (!data) {
          throw new Error('Risposta vuota dal server');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        setTrips(Array.isArray(data.data) ? data.data : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Errore caricamento gite');
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadTrips();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-400">
        Caricamento gite…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400">
        {error}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        Nessuna gita disponibile al momento.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Gite disponibili</h1>

      <ul className="grid gap-4">
        {trips.map(trip => (
          <li
            key={trip.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold">{trip.title}</h2>
                {trip.destination && (
                  <p className="text-sm text-slate-400">
                    Destinazione: {trip.destination}
                  </p>
                )}
                {trip.date && (
                  <p className="text-sm text-slate-400">
                    Data: {trip.date}
                  </p>
                )}
              </div>

              <Link
                href={`/trips/${trip.id}`}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
              >
                Dettagli
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

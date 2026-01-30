'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchJson } from '@/lib/netlifyFunctions';

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  date?: string | null;
};

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('');

  // --- auth headers sempre tipizzati correttamente ---
  function buildAuthHeaders(): Record<string, string> {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('sb_admin_token')
        : null;

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // --- LOAD ---
  async function loadTrips() {
    setLoading(true);
    setError(null);

    try {
      const headers = buildAuthHeaders();

      const data = await fetchJson('/.netlify/functions/admin-trips', {
        headers,
      });

      setTrips(data.data || []);
    } catch (e: any) {
      setError(e?.message || 'Errore caricamento gite');
    } finally {
      setLoading(false);
    }
  }

  // --- CREATE ---
  async function createTrip() {
    if (!newTitle.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      };

      const data = await fetchJson('/.netlify/functions/admin-trips', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTitle.trim(),
          destination: newDestination.trim() || undefined,
        }),
      });

      setTrips(prev => [data.data, ...prev]);
      setNewTitle('');
      setNewDestination('');
    } catch (e: any) {
      setError(e?.message || 'Errore creazione gita');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-white">
          Gite
        </h1>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* CREATE */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Titolo gita"
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-400"
          />

          <input
            value={newDestination}
            onChange={e => setNewDestination(e.target.value)}
            placeholder="Destinazione (opzionale)"
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={createTrip}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Crea
          </button>
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {loading && (
          <div className="text-sm font-semibold text-slate-400">
            Caricamento…
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="text-sm font-semibold text-slate-400">
            Nessuna gita presente.
          </div>
        )}

        {trips.map(trip => (
          <Link
            key={trip.id}
            href={`/admin/trips/${trip.id}`}
            className="block rounded-3xl border border-white/10 bg-slate-950/40 p-6 hover:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-black text-white">
                  {trip.title}
                </div>
                {trip.destination && (
                  <div className="mt-1 text-sm font-semibold text-slate-400">
                    {trip.destination}
                  </div>
                )}
              </div>

              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                Apri
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

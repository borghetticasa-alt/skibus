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

  async function loadTrips() {
    setLoading(true);
    setError(null);

    try {
      // ✅ usa Next API + token Supabase via fetchJson(withAuth)
      const data = await fetchJson('/api/admin-trips', { withAuth: true });
      setTrips(data.data || []);
    } catch (e: any) {
      setError(e?.message || 'Errore caricamento gite');
    } finally {
      setLoading(false);
    }
  }

  async function createTrip() {
    if (!newTitle.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson('/api/admin-trips', {
        method: 'POST',
        withAuth: true,
        body: JSON.stringify({
          title: newTitle.trim(),
          destination: newDestination.trim() || undefined,
          // opzionali:
          // basePrice: 79,
          // tripDate: "2026-02-10",
        }),
      });

      // il tuo route.ts ritorna { data } oppure { data: ... } a seconda della versione
      const created = data.data || data.trip || data;
      if (created?.id) setTrips(prev => [created, ...prev]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-white">Gite</h1>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

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

      <div className="space-y-4">
        {loading && <div className="text-sm font-semibold text-slate-400">Caricamento…</div>}

        {!loading && trips.length === 0 && (
          <div className="text-sm font-semibold text-slate-400">Nessuna gita presente.</div>
        )}

        {trips.map(trip => (
          <Link
            key={trip.id}
            href={`/admin/trips/${trip.id}`}
            className="block rounded-3xl border border-white/10 bg-slate-950/40 p-6 hover:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-black text-white">{trip.title}</div>
                {trip.destination && (
                  <div className="mt-1 text-sm font-semibold text-slate-400">{trip.destination}</div>
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
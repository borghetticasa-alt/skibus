'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bus, Calendar, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { fetchJson } from '@/lib/netlifyFunctions';

type TripRow = {
  id: string;
  title: string;
  destination?: string | null;
  trip_date?: string | null;
  status?: string | null;
  base_price?: number | null;
  created_at?: string | null;
};

function toneForStatus(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'draft') return 'warning' as const;
  if (status === 'cancelled') return 'danger' as const;
  return 'neutral' as const;
}

export default function TripsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openNew, setOpenNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newBasePrice, setNewBasePrice] = useState<number>(79);
  const [newCapacity, setNewCapacity] = useState<number>(49);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setToken(data.session?.access_token || null);
    })();
  }, []);

  const authHeaders = useMemo(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const loadTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/.netlify/functions/admin-trips', { headers: { ...authHeaders } });
      setTrips(data.data || []);
    } catch (e: any) {
      setError(e.message || 'Errore caricamento gite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createTrip = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const data = await fetchJson('/.netlify/functions/admin-trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          title: newTitle.trim(),
          destination: newDestination.trim() || undefined,
          tripDate: newDate || undefined,
          basePrice: Number(newBasePrice),
          capacity: Number(newCapacity),
        }),
      });
if (!res.ok) throw new Error(data?.error || 'Creazione gita fallita');

      const tripId = data?.trip?.id;
      if (!tripId) throw new Error('Creazione gita fallita (id mancante)');

      setOpenNew(false);
      setNewTitle('');
      setNewDestination('');
      setNewDate('');
      await loadTrips();

      window.location.href = `/admin/trips/${tripId}/overview`;
    } catch (e: any) {
      setError(e.message || 'Creazione gita fallita');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Gestione Gite</h1>
          <p className="text-sm text-slate-300/70">Crea e gestisci viaggi (dati reali su Supabase)</p>
        </div>

        <Button variant="primary" onClick={() => setOpenNew(true)}>
          <Plus size={16} className="mr-2" /> Nuova gita
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-slate-200/80">
            <Loader2 className="animate-spin" size={16} /> Caricamento gite...
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {trips.length === 0 ? (
              <div className="p-6 text-sm text-slate-200/70">Nessuna gita trovata. Creane una con “Nuova gita”.</div>
            ) : (
              trips.map((t) => {
                const dateLabel = t.trip_date ? String(t.trip_date).slice(0, 10) : '—';
                const priceLabel = Number.isFinite(Number(t.base_price)) ? `€ ${Number(t.base_price).toFixed(0)}` : '—';
                return (
                  <a
                    key={t.id}
                    href={`/admin/trips/${t.id}/overview`}
                    className="group flex items-center justify-between px-6 py-5 hover:bg-slate-950/30"
                  >
                    <div className="flex items-center gap-6">
                      <div className="h-10 w-1.5 rounded-full bg-emerald-500/70" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h2 className="font-semibold text-white">{t.destination || t.title}</h2>
                          <span className="rounded-xl border border-white/10 bg-slate-950/30 px-2 py-1 text-[10px] text-slate-200/80">
                            {t.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-300/70">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {dateLabel}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bus size={12} /> {priceLabel} / posto
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge tone={toneForStatus(String(t.status || 'active'))}>{String(t.status || 'active')}</Badge>
                      <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-400" />
                    </div>
                  </a>
                );
              })
            )}
          </div>
        )}
      </div>

      {openNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-black">Nuova gita</div>
                <div className="text-xs text-slate-200/70">Crea la gita + il primo bus (run)</div>
              </div>
              <button className="text-slate-200/70 hover:text-white" onClick={() => setOpenNew(false)}>
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="text-xs text-slate-200/80">
                Titolo *
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 p-2 text-sm text-white outline-none"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Es. Monterosa Ski – Alagna"
                />
              </label>

              <label className="text-xs text-slate-200/80">
                Destinazione (facoltativo)
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 p-2 text-sm text-white outline-none"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="Es. Gressoney / Champoluc"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="text-xs text-slate-200/80">
                  Data (facoltativa)
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 p-2 text-sm text-white outline-none"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </label>

                <label className="text-xs text-slate-200/80">
                  Prezzo base / posto
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 p-2 text-sm text-white outline-none"
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(Number(e.target.value))}
                  />
                </label>

                <label className="text-xs text-slate-200/80">
                  Posti bus iniziale
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 p-2 text-sm text-white outline-none"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpenNew(false)} disabled={creating}>Annulla</Button>
                <Button variant="primary" onClick={createTrip} disabled={creating || !newTitle.trim()}>
                  {creating ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> Creo...</span>
                  ) : (
                    'Crea gita'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Bus, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchJson } from '@/lib/netlifyFunctions';

type BusRun = { id: string; capacity: number; status?: string | null };
type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  trip_date?: string | null;
  status?: string | null;
  base_price?: number | null;
  bus_runs?: BusRun[] | null;
};

function fmtDate(v?: string | null) {
  if (!v) return '—';
  return String(v).slice(0, 10);
}

export default function TripsPublicPage() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchJson('/.netlify/functions/public-api/get-trips');
if (!alive) return;
        if (!res.ok) throw new Error(data?.error || 'Errore caricamento gite');
        setTrips(data?.data || []);
      } catch (e: any) {
        if (!alive) return;
        setError(e.message || 'Errore caricamento gite');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => trips || [], [trips]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Gite disponibili</h1>
        <p className="text-sm text-slate-200/70">
          Se l&apos;admin cambia bus/prezzi, qui si aggiorna automaticamente (dati reali).
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}

      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-slate-200/80">
            <Loader2 className="animate-spin" size={16} /> Caricamento...
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-slate-200/70">Nessuna gita attiva al momento.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((t) => {
              const busRun = (t.bus_runs || []).find(b => (b.status || 'open') !== 'cancelled') || (t.bus_runs || [])[0];
              const busRunId = busRun?.id || '';
              const price = Number.isFinite(Number(t.base_price)) ? `€ ${Number(t.base_price).toFixed(0)}` : '—';
              const capacity = busRun?.capacity ? `${busRun.capacity} posti` : '—';
              const href = busRunId ? `/checkout?tripId=${encodeURIComponent(t.id)}&busRunId=${encodeURIComponent(busRunId)}&seats=1` : `/trips`;

              return (
                <div key={t.id} className="flex flex-col gap-3 px-4 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-white">{t.destination || t.title}</div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200/70">
                      <span className="inline-flex items-center gap-1"><Calendar size={12}/> {fmtDate(t.trip_date)}</span>
                      <span className="inline-flex items-center gap-1"><Bus size={12}/> {capacity}</span>
                      <span className="inline-flex items-center gap-1">Prezzo: {price} / posto</span>
                    </div>
                    {!busRunId && (
                      <div className="text-xs text-amber-200/80">Bus non configurato: contatta l&apos;admin.</div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Link href={href}>
                      <Button variant="primary" disabled={!busRunId}>
                        Prenota <ArrowRight size={16} className="ml-2"/>
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

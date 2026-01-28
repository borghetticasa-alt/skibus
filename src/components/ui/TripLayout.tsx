'use client';

import React from 'react';
import { TripNavigation, BadgeTab, IdTab } from './TripNavigation';

export type StatoGita = 'BOZZA' | 'IN_ATTESA' | 'CONFERMATA' | 'BLOCCATA' | 'PIENA' | 'ANNULLATA';
export type LivelloSla = 'VERDE' | 'GIALLO' | 'ROSSO';

export type RiepilogoGita = {
  nomeDestinazione: string;
  etichettaPartenza: string;
  stato: StatoGita;
  sla?: { livello: LivelloSla; etichetta: string; etichettaScadenza?: string };
};

function pillStato(stato: StatoGita) {
  switch (stato) {
    case 'CONFERMATA':
      return 'bg-emerald-100 text-emerald-700';
    case 'IN_ATTESA':
      return 'bg-amber-100 text-amber-700';
    case 'BLOCCATA':
      return 'bg-violet-100 text-violet-700';
    case 'PIENA':
      return 'bg-rose-100 text-rose-700';
    case 'ANNULLATA':
      return 'bg-slate-900 text-slate-200';
    case 'BOZZA':
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function pillSla(livello: LivelloSla) {
  switch (livello) {
    case 'VERDE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'GIALLO':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'ROSSO':
    default:
      return 'bg-rose-50 text-rose-700 border-rose-100';
  }
}

export function TripLayout(props: {
  id: string;
  activeTab: IdTab | string;
  riepilogo?: RiepilogoGita; // <-- opzionale per non crashare mai
  badges?: Partial<Record<IdTab, BadgeTab>>;
  children: React.ReactNode;
}) {
  const { id, activeTab, riepilogo, badges, children } = props;

  const fallback: RiepilogoGita = {
    nomeDestinazione: 'Gita',
    etichettaPartenza: '—',
    stato: 'BOZZA',
    sla: { livello: 'VERDE', etichetta: 'OK' },
  };

  const r = riepilogo ?? fallback;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {r.nomeDestinazione}
                </h1>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${pillStato(r.stato)}`}>
                  {r.stato.replace(/_/g, ' ')}
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-400">
                {r.etichettaPartenza}
              </p>

              {r.sla?.etichetta ? (
                <div className="mt-3 inline-flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${pillSla(r.sla.livello)}`}>
                    {r.sla.etichetta}
                  </span>
                  {r.sla.etichettaScadenza ? (
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {r.sla.etichettaScadenza}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <TripNavigation tripId={id} activeTab={String(activeTab)} badges={badges} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
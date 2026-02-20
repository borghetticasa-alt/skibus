import React from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin, ShieldCheck } from 'lucide-react';
import TripNavigation, { TabBadge } from './TripNavigation';

export type TripStatus = 'DRAFT' | 'SOFT_HOLD' | 'CONFIRMED' | 'LOCKED' | 'FULL' | 'CANCELLED';
export type SlaLevel = 'GREEN' | 'YELLOW' | 'RED';

export interface TripSummary {
  destinationName: string;
  departureLabel: string;
  status: TripStatus;
  sla: {
    level: SlaLevel;
    label: string;
    deadlineLabel?: string;
  };
}

type TabId = 'overview' | 'waitlist' | 'numbers' | 'audit';

interface Props {
  id: string;
  activeTab: TabId | string;
  children: React.ReactNode;
  tripSummary?: TripSummary;
  navBadges?: Partial<Record<TabId, TabBadge>>;
}

const statusLabel: Record<TripStatus, string> = {
  DRAFT: 'Bozza',
  SOFT_HOLD: 'In raccolta',
  CONFIRMED: 'Confermata',
  LOCKED: 'Bloccata',
  FULL: 'Piena',
  CANCELLED: 'Annullata',
};

const statusTone: Record<TripStatus, string> = {
  DRAFT: 'bg-white/5 border-white/10 text-slate-200',
  SOFT_HOLD: 'bg-amber-500/10 border-amber-500/20 text-amber-100',
  CONFIRMED: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100',
  LOCKED: 'bg-slate-500/10 border-white/10 text-slate-200',
  FULL: 'bg-rose-500/10 border-rose-500/20 text-rose-100',
  CANCELLED: 'bg-rose-500/10 border-rose-500/20 text-rose-100',
};

export const TripLayout: React.FC<Props> = ({ id, activeTab, children, tripSummary, navBadges }) => {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/admin/trips"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
              aria-label="Torna alle gite"
              title="Torna alle gite"
            >
              <ChevronLeft size={18} className="text-slate-100" />
            </Link>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xl md:text-2xl font-black text-white">Gita</div>
                {tripSummary?.status && (
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${statusTone[tripSummary.status]}`}>
                    <span className="h-2 w-2 rounded-full bg-white/30" />
                    {statusLabel[tripSummary.status]}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-100">
                  <ShieldCheck size={14} />
                  Admin
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200/80">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={14} className="text-slate-200/80" />
                  {tripSummary?.destinationName || 'Destinazione'}
                </span>
                <span className="text-slate-400/60">•</span>
                <span>{tripSummary?.departureLabel || 'Partenza'}</span>
              </div>

              {tripSummary?.sla?.label && (
                <div className="text-xs text-slate-300/70">
                  SLA: <span className="text-white/80 font-bold">{tripSummary.sla.label}</span>
                  {tripSummary.sla.deadlineLabel ? <span className="ml-2">({tripSummary.sla.deadlineLabel})</span> : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <TripNavigation tripId={id} activeTab={activeTab as TabId} badges={navBadges} />
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5 md:p-6">
        {children}
      </div>
    </div>
  );
};

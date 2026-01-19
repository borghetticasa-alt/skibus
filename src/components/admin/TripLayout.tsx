import React from 'react';
import Link from 'next/link';
import { Bus, ChevronLeft, MapPin, ShieldCheck } from 'lucide-react';
import TripNavigation from './TripNavigation';

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

type TabId = 'overview' | 'buses' | 'waitlist' | 'numbers' | 'audit';

export type TabBadge =
  | { kind: 'dot'; tone: 'GREEN' | 'YELLOW' | 'RED' }
  | { kind: 'count'; value: number | string; tone?: 'default' | 'danger' | 'success' };

interface Props {
  id: string;
  activeTab: TabId | string;
  children: React.ReactNode;
  tripSummary?: TripSummary;

  /**
   * Badge opzionali sui tab (UI polish).
   * Esempio:
   * navBadges={{ waitlist: { kind:'count', value: 12 }, numbers:{kind:'count', value:'€+'} }}
   */
  navBadges?: Partial<Record<TabId, TabBadge>>;
}

const statusStyles: Record<TripStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SOFT_HOLD: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  LOCKED: 'bg-violet-100 text-violet-700',
  FULL: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-800 text-slate-200',
};

const slaDotStyles: Record<SlaLevel, string> = {
  GREEN: 'bg-emerald-500',
  YELLOW: 'bg-amber-500',
  RED: 'bg-rose-500',
};

export const TripLayout: React.FC<Props> = ({ id, activeTab, children, tripSummary, navBadges }) => {
  const destination = tripSummary?.destinationName || 'Monte Rosa Bus';
  const departure = tripSummary?.departureLabel || 'Admin Dashboard';
  const currentStatus = tripSummary?.status;
  const currentSla = tripSummary?.sla;

  // 🔥 Badge default “premium”: dot SLA sul tab overview (solo se abbiamo SLA)
  const mergedBadges: Partial<Record<TabId, TabBadge>> = {
    ...(currentSla ? { overview: { kind: 'dot', tone: currentSla.level } } : {}),
    ...(navBadges || {}),
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* Top mini bar */}
      <div className="bg-slate-900 text-white py-2 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
            <Bus size={12} className="text-indigo-400" />
            Monte Rosa Bus <span className="text-slate-500">/</span>
            <span className="text-indigo-400">Admin Console</span>
          </div>
          <div className="text-[10px] font-medium text-slate-400">
            Internal Logistics <span className="text-slate-600">v2.4</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          {/* Left */}
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/admin/trips"
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-95"
              aria-label="Torna alla lista gite"
              title="Torna alla lista gite"
            >
              <ChevronLeft size={20} />
            </Link>

            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100 shrink-0">
                <ShieldCheck size={20} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-black text-lg tracking-tight truncate max-w-[55vw]">
                    {destination}
                  </h1>

                  {currentStatus && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-widest ${statusStyles[currentStatus]}`}
                      title={`Stato: ${currentStatus}`}
                    >
                      {currentStatus.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-slate-400 text-xs font-bold flex items-center gap-1">
                    <MapPin size={12} /> {departure}
                  </p>
                  <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
                    Trip ID: <span className="text-slate-500">{id || '—'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4 shrink-0">
            {/* SLA block */}
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                SLA Health
              </div>
              <div className="flex flex-col items-end">
                {currentSla ? (
                  <>
                    <div className="flex items-center gap-1.5 justify-end">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${slaDotStyles[currentSla.level]} ${
                          currentSla.level !== 'RED' ? 'animate-pulse' : ''
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          currentSla.level === 'GREEN'
                            ? 'text-emerald-600'
                            : currentSla.level === 'YELLOW'
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {currentSla.label}
                      </span>
                    </div>
                    {currentSla.deadlineLabel && (
                      <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                        {currentSla.deadlineLabel}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-300">—</span>
                )}
              </div>
            </div>

            <div className="w-px h-8 bg-slate-100 mx-2 hidden sm:block" />

            {/* User */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-bold">Ops Manager</div>
                <div className="text-[10px] text-slate-400">Console Admin</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"
                  alt="Admin Avatar"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <TripNavigation tripId={id} activeTab={String(activeTab)} badges={mergedBadges} />

        <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
};
import React from 'react';
import Link from 'next/link';
import { Bus, ChevronLeft, MapPin, ShieldCheck } from 'lucide-react';
import TripNavigation from './TripNavigation';

export type TripStatus = 'DRAFT' | 'SOFT_HOLD' | 'CONFIRMED' | 'LOCKED' | 'FULL' | 'CANCELLED';
export type SlaLevel = 'GREEN' | 'YELLOW' | 'RED';

interface TripSummary {
  destinationName: string;
  departureLabel: string;
  status: TripStatus;
  sla: {
    level: SlaLevel;
    label: string;
    deadlineLabel?: string;
  };
}

interface Props {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  tripSummary?: TripSummary;
}

const statusStyles: Record<TripStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SOFT_HOLD: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  LOCKED: 'bg-violet-100 text-violet-700',
  FULL: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-800 text-slate-200',
};

const slaStyles: Record<SlaLevel, string> = {
  GREEN: 'bg-emerald-500',
  YELLOW: 'bg-amber-500',
  RED: 'bg-rose-500',
};

export const TripLayout: React.FC<Props> = ({ id, activeTab, children, tripSummary }) => {
  // Se tripSummary non è presente, usiamo fallback neutri
  const destination = tripSummary?.destinationName || "Monte Rosa Bus";
  const departure = tripSummary?.departureLabel || "Admin Dashboard";
  const currentStatus = tripSummary?.status;
  const currentSla = tripSummary?.sla;

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* Top Header Branding */}
      <div className="bg-slate-900 text-white py-2 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
            <Bus size={12} className="text-indigo-400" />
            Monte Rosa Bus — <span className="text-indigo-400">Admin Console</span>
          </div>
          <div className="text-[10px] font-medium text-slate-400">
            Internal Logistics v2.4
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/trips" 
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-lg tracking-tight">{destination}</h1>
                  {currentStatus && (
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-widest ${statusStyles[currentStatus]}`}>
                      {currentStatus.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs font-bold flex items-center gap-1">
                   <MapPin size={12}/> {departure}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SLA Health</div>
              <div className="flex flex-col items-end">
                {currentSla ? (
                  <>
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className={`w-2.5 h-2.5 rounded-full ${slaStyles[currentSla.level]} ${currentSla.level !== 'RED' ? 'animate-pulse' : ''}`} />
                      <span className={`text-xs font-bold ${currentSla.level === 'GREEN' ? 'text-emerald-600' : currentSla.level === 'YELLOW' ? 'text-amber-600' : 'text-rose-600'}`}>
                        {currentSla.label}
                      </span>
                    </div>
                    {currentSla.deadlineLabel && (
                      <span className="text-[9px] text-slate-400 font-bold mt-0.5">{currentSla.deadlineLabel}</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-300">—</span>
                )}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-100 mx-2" />
            <div className="flex items-center gap-3">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-bold">Ops Manager</div>
                <div className="text-[10px] text-slate-400">Console Admin</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                 <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin Avatar" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <TripNavigation tripId={id} activeTab={activeTab} />
        <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
};
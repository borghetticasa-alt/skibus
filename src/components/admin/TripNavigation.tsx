import React from 'react';
import Link from 'next/link';

type TabId = 'overview' | 'buses' | 'waitlist' | 'numbers' | 'audit';

export type TabBadge =
  | { kind: 'dot'; tone: 'GREEN' | 'YELLOW' | 'RED' }
  | { kind: 'count'; value: number | string; tone?: 'default' | 'danger' | 'success' };

interface NavProps {
  tripId: string;
  activeTab: string;

  /**
   * Badge opzionali sui tab
   * Esempio:
   * badges={{ waitlist:{kind:'count', value: 12}, overview:{kind:'dot', tone:'YELLOW'} }}
   */
  badges?: Partial<Record<TabId, TabBadge>>;
}

interface TabConfig {
  id: TabId;
  label: string;
  path: (tripId: string) => string;
  enabled: boolean;
}

const dotTone: Record<'GREEN' | 'YELLOW' | 'RED', string> = {
  GREEN: 'bg-emerald-500',
  YELLOW: 'bg-amber-500',
  RED: 'bg-rose-500',
};

function Badge({ badge }: { badge: TabBadge }) {
  if (badge.kind === 'dot') {
    return (
      <span
        className={`ml-2 inline-flex items-center justify-center w-2 h-2 rounded-full ${dotTone[badge.tone]}`}
        aria-label={`SLA ${badge.tone}`}
        title={`SLA ${badge.tone}`}
      />
    );
  }

  const tone = badge.tone || 'default';
  const cls =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : tone === 'danger'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span
      className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black border ${cls}`}
      title="Badge"
    >
      {badge.value}
    </span>
  );
}

const TripNavigation: React.FC<NavProps> = ({ tripId, activeTab, badges }) => {
  const hasTripId = Boolean(tripId && tripId !== 'undefined');

  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Riepilogo', path: (id) => `/admin/trips/${id}/overview`, enabled: true },
    { id: 'buses', label: 'Gestione Bus', path: (id) => `/admin/trips/${id}/buses`, enabled: true },
    { id: 'waitlist', label: 'Waitlist', path: (id) => `/admin/trips/${id}/waitlist`, enabled: true },
    { id: 'numbers', label: 'Economia', path: (id) => `/admin/trips/${id}/numbers`, enabled: true },
    { id: 'audit', label: 'Audit Log', path: (id) => `/admin/trips/${id}/audit`, enabled: true },
  ];

  return (
    <div className="space-y-3">
      {!hasTripId && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-4 py-3 text-xs font-bold">
          Trip ID mancante: navigazione disabilitata (evitiamo URL “undefined”).
        </div>
      )}

      <nav
        className="flex items-center space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar border border-slate-200/60 shadow-inner"
        aria-label="Trip Sub-navigation"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isEnabled = tab.enabled && hasTripId;
          const badge = badges?.[tab.id];

          if (!isEnabled) {
            return (
              <div
                key={tab.id}
                className="relative flex items-center whitespace-nowrap px-6 py-2.5 text-sm font-black rounded-xl text-slate-400 cursor-not-allowed select-none"
                aria-disabled="true"
              >
                {tab.label}
                {badge && <Badge badge={badge} />}
                {!hasTripId && (
                  <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-[8px] font-black uppercase tracking-tighter rounded">
                    Bloccato
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.path(tripId)}
              className={`
                relative flex items-center whitespace-nowrap px-6 py-2.5 text-sm font-black rounded-xl transition-all duration-200
                ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
              {badge && <Badge badge={badge} />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default TripNavigation;
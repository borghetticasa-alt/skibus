import React from 'react';
import Link from 'next/link';

type TabId = 'overview' | 'waitlist' | 'numbers' | 'audit';

export type TabBadge =
  | { kind: 'dot'; tone: 'GREEN' | 'YELLOW' | 'RED' }
  | { kind: 'count'; value: number | string; tone?: 'default' | 'danger' | 'success' };

interface NavProps {
  tripId: string;
  activeTab: string;
  badges?: Partial<Record<TabId, TabBadge>>;
}

interface TabConfig {
  id: TabId;
  label: string;
  path: (tripId: string) => string;
}

const dotTone: Record<'GREEN' | 'YELLOW' | 'RED', string> = {
  GREEN: 'bg-emerald-400',
  YELLOW: 'bg-amber-400',
  RED: 'bg-rose-400',
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
      ? 'bg-emerald-500/15 text-emerald-100 border-emerald-500/20'
      : tone === 'danger'
      ? 'bg-rose-500/15 text-rose-100 border-rose-500/20'
<<<<<<< HEAD
      : 'bg-white/5/5 text-slate-100 border-white/10';
=======
      : 'bg-white/5 text-slate-100 border-white/10';
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a

  return (
    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black border ${cls}`} title="Badge">
      {badge.value}
    </span>
  );
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Riepilogo', path: (id) => `/admin/trips/${id}/overview` },
  { id: 'waitlist', label: 'Waitlist', path: (id) => `/admin/trips/${id}/waitlist` },
  { id: 'numbers', label: 'Numeri', path: (id) => `/admin/trips/${id}/numbers` },
  { id: 'audit', label: 'Audit', path: (id) => `/admin/trips/${id}/audit` },
];

const TripNavigation: React.FC<NavProps> = ({ tripId, activeTab, badges }) => {
  const hasTripId = Boolean(tripId && tripId !== 'undefined');

  return (
    <div className="space-y-3">
      {!hasTripId && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-100">
          Trip ID mancante: navigazione disabilitata (evitiamo URL “undefined”).
        </div>
      )}

      <nav
        className="w-full overflow-x-auto no-scrollbar rounded-2xl border border-white/10 bg-slate-950/30 p-1.5"
        aria-label="Trip navigation"
      >
        <div className="flex items-center gap-2 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const badge = badges?.[tab.id];

            if (!hasTripId) {
              return (
                <div
                  key={tab.id}
                  className="flex items-center whitespace-nowrap px-5 py-2.5 text-sm font-black rounded-xl text-slate-400 select-none"
                  aria-disabled="true"
                >
                  {tab.label}
                  {badge && <Badge badge={badge} />}
<<<<<<< HEAD
                  <span className="ml-2 px-1.5 py-0.5 bg-white/5/5 text-[8px] font-black uppercase tracking-tighter rounded">
=======
                  <span className="ml-2 px-1.5 py-0.5 bg-white/5 text-[8px] font-black uppercase tracking-tighter rounded">
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
                    Bloccato
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.path(tripId)}
                className={
                  'flex items-center whitespace-nowrap px-5 py-2.5 text-sm font-black rounded-xl transition-all ' +
                  (isActive
<<<<<<< HEAD
                    ? 'bg-white/5/10 text-white border border-white/10'
                    : 'text-slate-200/80 hover:text-white hover:bg-white/5/5 border border-transparent')
=======
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-slate-200/80 hover:text-white hover:bg-white/5 border border-transparent')
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
                }
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
                {badge && <Badge badge={badge} />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default TripNavigation;

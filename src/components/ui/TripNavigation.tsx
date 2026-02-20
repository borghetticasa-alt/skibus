'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export type IdTab = 'overview' | 'waitlist' | 'numbers' | 'audit';

export type BadgeTab =
  | { kind: 'dot'; tone: 'GREEN' | 'YELLOW' | 'RED' }
  | { kind: 'count'; value: number | string; tone?: 'default' | 'danger' | 'success' };

function Badge({ badge }: { badge: BadgeTab }) {
  if (badge.kind === 'dot') {
    const cls = badge.tone === 'GREEN' ? 'bg-emerald-400' : badge.tone === 'YELLOW' ? 'bg-amber-400' : 'bg-rose-400';
    return <span className={`ml-2 inline-block h-2 w-2 rounded-full ${cls}`} aria-hidden="true" />;
  }

  const tone = badge.tone || 'default';
  const cls =
    tone === 'success'
      ? 'bg-emerald-500/15 text-emerald-100 border-emerald-500/20'
      : tone === 'danger'
      ? 'bg-rose-500/15 text-rose-100 border-rose-500/20'
      : 'bg-white/5 text-slate-100 border-white/10';

  return <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-black ${cls}`}>{badge.value}</span>;
}

const tabs: Array<{ id: IdTab; label: string; path: (tripId: string) => string }> = [
  { id: 'overview', label: 'Riepilogo', path: (id) => `/admin/trips/${id}/overview` },
  { id: 'waitlist', label: 'Waitlist', path: (id) => `/admin/trips/${id}/waitlist` },
  { id: 'numbers', label: 'Numeri', path: (id) => `/admin/trips/${id}/numbers` },
  { id: 'audit', label: 'Audit', path: (id) => `/admin/trips/${id}/audit` },
];

export function TripNavigation(props: {
  tripId?: string;
  activeTab: IdTab | string;
  badges?: Partial<Record<IdTab, BadgeTab>>;
}) {
  const { tripId, activeTab, badges } = props;
  const params = useParams();
  const idFromParams = typeof (params as any)?.id === 'string' ? ((params as any).id as string) : '';
  const finalTripId = String(tripId || idFromParams || '').trim();

  if (!finalTripId) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
        Trip ID mancante: navigazione disabilitata.
      </div>
    );
  }

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Trip navigation">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.path(finalTripId)}
            className={
              'inline-flex items-center rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-wider ' +
              (isActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900')
            }
          >
            {tab.label}
            {badges?.[tab.id] ? <Badge badge={badges[tab.id] as BadgeTab} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

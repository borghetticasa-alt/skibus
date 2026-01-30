'use client';

import React from 'react';
import Link from 'next/link';

export type IdTab =
  | 'overview'
  | 'numbers'
  | 'buses'
  | 'waitlist'
  | 'audit';

export type BadgeTab = {
  testo: string;
  tono?: 'neutro' | 'info' | 'ok' | 'warn' | 'danger';
};

function pillBadge(tono: NonNullable<BadgeTab['tono']>) {
  switch (tono) {
    case 'ok':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'warn':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'danger':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'info':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'neutro':
    default:
      return 'bg-slate-100 text-slate-600 border-white/10';
  }
}

export function TripNavigation(props: {
  tripId: string;
  activeTab: string;
  badges?: Partial<Record<IdTab, BadgeTab>>;
}) {
  const { tripId, activeTab, badges } = props;

  const tabs: Array<{ id: IdTab; label: string; href: string }> = [
    { id: 'overview', label: 'Panoramica', href: `/admin/trips/${tripId}/overview` },
    { id: 'numbers', label: 'Numeri', href: `/admin/trips/${tripId}/numbers` },
    { id: 'buses', label: 'Flotta', href: `/admin/trips/${tripId}/overview` },
    { id: 'waitlist', label: "Lista d'attesa", href: `/admin/trips/${tripId}/waitlist` },
    { id: 'audit', label: 'Audit', href: `/admin/trips/${tripId}/audit` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((t) => {
        const attivo = String(activeTab) === t.id;
        const badge = badges?.[t.id];

        return (
          <Link
            key={t.id}
            href={t.href}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all',
              attivo
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white/5 text-slate-500 border-white/10 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
          >
            <span>{t.label}</span>

            {badge?.testo ? (
              <span
                className={[
                  'ml-1 inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black tracking-widest',
                  pillBadge(badge.tono ?? 'neutro'),
                ].join(' ')}
              >
                {badge.testo}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
// src/components/ui/kpi.tsx
import React from 'react';
import { brand } from './brand';

export function Kpi({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: 'default' | 'primary' | 'good' | 'warn' | 'bad';
}) {
  const toneBg =
    tone === 'primary' ? 'bg-indigo-50 text-indigo-600'
    : tone === 'good' ? 'bg-emerald-50 text-emerald-600'
    : tone === 'warn' ? 'bg-amber-50 text-amber-600'
    : tone === 'bad' ? 'bg-rose-50 text-rose-600'
    : 'bg-slate-50 text-slate-400';

  return (
    <div className={`${brand.bg.card} p-6 ${brand.radius.card} border border-slate-200 ${brand.shadow.soft} flex items-center gap-4`}>
      <div className={`p-3 ${brand.radius.tile} ${toneBg}`}>{icon}</div>
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}

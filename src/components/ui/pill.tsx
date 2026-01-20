// src/components/ui/pill.tsx
import React from 'react';
import { brand } from './brand';

type Tone = 'default' | 'primary' | 'good' | 'warn' | 'bad';

const map: Record<Tone, string> = {
  default: `bg-slate-100 ${brand.color.mute}`,
  primary: `bg-indigo-100 ${brand.color.primary}`,
  good: `bg-emerald-100 ${brand.color.good}`,
  warn: `bg-amber-100 ${brand.color.warn}`,
  bad: `bg-rose-100 ${brand.color.bad}`,
};

export function Pill({ children, tone = 'default' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${map[tone]} ${brand.radius.pill}`}>
      {children}
    </span>
  );
}

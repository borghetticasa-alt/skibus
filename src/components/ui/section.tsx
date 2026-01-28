// src/components/ui/section.tsx
import React from 'react';
import { brand } from './brand';

export function Section({
  title,
  subtitle,
  action,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /**
   * Back-compat: some pages used `right` for the header slot.
   * Prefer `action` going forward.
   */
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headerSlot = action ?? right;
  return (
    <div className={`${brand.bg.card} ${brand.radius.card} border border-slate-200 p-6 md:p-8 ${brand.shadow.soft}`}>
      <div className="flex items-start md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className={`text-lg font-semibold ${brand.color.ink}`}>{title}</h2>
          {subtitle && <p className={`text-xs ${brand.color.soft} mt-1`}>{subtitle}</p>}
        </div>
        {headerSlot}
      </div>
      {children}
    </div>
  );
}

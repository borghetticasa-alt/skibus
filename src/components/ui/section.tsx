// src/components/ui/section.tsx
import React from 'react';
import { brand } from './brand';

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`${brand.bg.card} ${brand.radius.card} border border-slate-200 p-6 md:p-8 ${brand.shadow.soft}`}>
      <div className="flex items-start md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className={`text-lg font-semibold ${brand.color.ink}`}>{title}</h2>
          {subtitle && <p className={`text-xs ${brand.color.soft} mt-1`}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

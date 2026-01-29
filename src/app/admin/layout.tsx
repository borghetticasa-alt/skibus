
'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
        <nav className="flex flex-wrap gap-2">
          <Link href="/admin/trips" className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-white/5/10 hover:bg-white/5/15">
            Gite
          </Link>
          <Link href="/admin/settings" className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-white/5/10 hover:bg-white/5/15">
            Impostazioni
          </Link>
        </nav>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-6">
        {children}
      </div>
    </div>
  );
}

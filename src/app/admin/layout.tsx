
'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
        <nav className="flex flex-wrap gap-2">
<<<<<<< HEAD
          <Link href="/admin/trips" className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-white/5/10 hover:bg-white/5/15">
            Gite
          </Link>
          <Link href="/admin/settings" className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-white/5/10 hover:bg-white/5/15">
=======
          <Link href="/admin/trips" className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-white/10 hover:bg-white/15">
            Gite
          </Link>
          <Link href="/admin/settings" className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-white/10 hover:bg-white/15">
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
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

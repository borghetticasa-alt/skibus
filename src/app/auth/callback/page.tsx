'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/';

  useEffect(() => {
    (async () => {
      await supabase.auth.getSession();
      window.location.replace(redirect);
    })();
  }, [redirect]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5/5 p-6 backdrop-blur">
        <div className="text-lg font-black text-white">Accesso in corso…</div>
        <div className="mt-2 text-sm text-slate-200/80">
          Ti stiamo reindirizzando.
        </div>
      </div>
    </div>
  );
}

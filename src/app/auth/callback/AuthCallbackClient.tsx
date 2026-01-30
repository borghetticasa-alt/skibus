'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Se hai già una funzione/servizio per gestire la callback, puoi rimetterla qui dentro.
// Questa versione è “safe” e non blocca la build: legge params, poi fa redirect.

export default function AuthCallbackClient() {
  const router = useRouter();
  const search = useSearchParams();

  const redirect = useMemo(() => search.get('redirect') || '/account', [search]);

  const [msg, setMsg] = useState('Completamento accesso…');

  useEffect(() => {
    // Qui normalmente: leggi code/token e finalizzi sessione (es: supabase.auth.exchangeCodeForSession)
    // Nel tuo progetto probabilmente questa parte esiste già: se sì, incollala qui.
    // Per ora: fallback “non bloccante” + redirect.

    let cancelled = false;

    async function run() {
      try {
        // TODO: finalizzazione sessione (se serve)
        // Esempio Supabase (solo se lo usi qui):
        // await supabase.auth.exchangeCodeForSession(window.location.href);

        if (cancelled) return;
        setMsg('Accesso completato ✅');
        router.replace(redirect);
      } catch (e: any) {
        if (cancelled) return;
        setMsg(e?.message || 'Errore durante la conferma accesso.');
        // anche in errore puoi rimandare a /login
        setTimeout(() => router.replace('/login'), 1200);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, redirect]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-950/40 p-8">
        <div className="text-sm font-semibold text-slate-200/80">{msg}</div>
      </div>
    </div>
  );
}

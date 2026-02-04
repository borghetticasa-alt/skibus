'use client';

import { useSearchParams } from 'next/navigation';

// INCOLLA QUI SOTTO IL TUO VECCHIO CODICE LOGIN (quello che prima era in page.tsx)
// Regola d’oro: lascia "use client" e usaSearchParams qui dentro, non nel wrapper.

export default function LoginClient() {
  const search = useSearchParams();

  // ⚠️ placeholder: sostituisci tutto con il tuo vecchio componente
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-950/40 p-8">
        <div className="text-sm font-semibold text-slate-200/80">
          Incolla qui il vecchio login.
        </div>
      </div>
    </div>
  );
}

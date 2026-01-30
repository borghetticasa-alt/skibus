'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type UiStatus = 'loading' | 'success' | 'error';

export default function PayPalReturnPage() {
  const router = useRouter();
  const search = useSearchParams();

  const orderId = useMemo(() => {
    // PayPal di solito ritorna token=ORDER_ID (per Orders v2)
    return search.get('token') || search.get('orderId') || '';
  }, [search]);

  const bookingId = useMemo(() => {
    return search.get('bookingId') || '';
  }, [search]);

  const [status, setStatus] = useState<UiStatus>('loading');
  const [message, setMessage] = useState<string>('Confermo il pagamento…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Validazione parametri
      if (!orderId) {
        setStatus('error');
        setMessage('Parametro PayPal mancante (orderId/token).');
        return;
      }

      if (!bookingId) {
        setStatus('error');
        setMessage('Parametro mancante: bookingId.');
        return;
      }

      try {
        // Chiamata capture lato server (API Next.js)
        const res = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, bookingId }),
        });

        // Proviamo a leggere JSON anche su error (molte API mandano dettagli)
        const json = await res
          .json()
          .catch(() => ({} as any));

        if (cancelled) return;

        if (!res.ok || !json?.success) {
          setStatus('error');
          setMessage(
            json?.error ||
              'Pagamento non confermato. Se hai già pagato, contatta l’assistenza.'
          );
          return;
        }

        setStatus('success');
        setMessage('Pagamento confermato ✅');

        // Redirect soft verso account/dettaglio prenotazione
        setTimeout(() => {
          if (!cancelled) router.push(`/account?highlight=${encodeURIComponent(bookingId)}`);
        }, 1200);
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setMessage(e?.message || 'Errore di rete durante la conferma pagamento.');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [orderId, bookingId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-950/40 p-8 space-y-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          PayPal Return
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">
          {status === 'loading' && 'Sto verificando…'}
          {status === 'success' && 'Tutto ok'}
          {status === 'error' && 'Problema'}
        </h1>

        <p
          className={`text-sm font-semibold leading-relaxed ${
            status === 'error' ? 'text-rose-200' : 'text-slate-200/80'
          }`}
        >
          {message}
        </p>

        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-xs font-mono text-slate-300/80 space-y-1">
          <div>
            <span className="text-slate-400">orderId:</span> {orderId || '—'}
          </div>
          <div>
            <span className="text-slate-400">bookingId:</span> {bookingId || '—'}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/account')}
            className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20"
          >
            Vai ad Account
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-700"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

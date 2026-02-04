'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/netlifyFunctions';
import { supabase } from '@/lib/supabaseClient';

type CheckoutError = 'MISSING_PARAMS' | 'NOT_AUTHENTICATED' | 'REQUEST_FAILED';

type Provider = 'stripe' | 'paypal';

export default function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();

  const tripId = useMemo(() => params.get('tripId'), [params]);
  const busRunId = useMemo(() => params.get('busRunId'), [params]);

  // ✅ provider scelto da URL (default stripe)
  const provider = useMemo<Provider>(() => {
    const p = (params.get('provider') || 'stripe').toLowerCase();
    return p === 'paypal' ? 'paypal' : 'stripe';
  }, [params]);

  const [seats, setSeats] = useState(1);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const isValid = useMemo(() => !!tripId && !!busRunId && seats > 0, [tripId, busRunId, seats]);

  async function getSupabaseBearer(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  }

  async function startCheckout() {
    setError(null);
    setErrorDetail(null);

    if (!tripId || !busRunId) {
      setError('MISSING_PARAMS');
      setErrorDetail('Mancano tripId o busRunId nella URL.');
      return;
    }

    const token = await getSupabaseBearer();
    if (!token) {
      setError('NOT_AUTHENTICATED');
      setErrorDetail('Sessione Supabase assente: fai login cliente prima di pagare.');
      return;
    }

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const endpoint = provider === 'paypal' ? '/api/paypal/create-order' : '/api/stripe-checkout';

      const response = await fetchJson(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tripId, busRunId, seats, attendees }),
      });

      if (provider === 'paypal') {
        const link = response?.approveLink;
        if (!link) throw new Error('PayPal: risposta senza approveLink');
        window.location.href = link;
        return;
      }

      const url = response?.url;
      if (!url) throw new Error('Stripe: risposta senza url');
      window.location.href = url;
    } catch (e: any) {
      setError('REQUEST_FAILED');
      setErrorDetail(e?.message || 'Errore sconosciuto durante checkout');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <h1 className="text-3xl font-black tracking-tight text-white">Checkout</h1>

      <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-300/70">Metodo pagamento</div>
            <div className="text-sm font-black text-white">
              {provider === 'paypal' ? 'PayPal (blocco fondi)' : 'Carta (Stripe)'}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.replace(`/checkout?tripId=${encodeURIComponent(tripId || '')}&busRunId=${encodeURIComponent(busRunId || '')}&provider=stripe`)}
              className={`rounded-xl px-3 py-2 text-xs font-black border ${
                provider === 'stripe'
                  ? 'bg-white/10 text-white border-white/15'
                  : 'bg-transparent text-slate-300 border-white/10 hover:bg-white/5'
              }`}
            >
              Stripe
            </button>
            <button
              type="button"
              onClick={() => router.replace(`/checkout?tripId=${encodeURIComponent(tripId || '')}&busRunId=${encodeURIComponent(busRunId || '')}&provider=paypal`)}
              className={`rounded-xl px-3 py-2 text-xs font-black border ${
                provider === 'paypal'
                  ? 'bg-white/10 text-white border-white/15'
                  : 'bg-transparent text-slate-300 border-white/10 hover:bg-white/5'
              }`}
            >
              PayPal
            </button>
          </div>
        </div>

        <label className="block text-sm font-bold text-slate-300">Numero posti</label>
        <input
          type="number"
          min={1}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <div>
            {error === 'MISSING_PARAMS' && 'Dati mancanti per la prenotazione.'}
            {error === 'NOT_AUTHENTICATED' && 'Devi effettuare il login cliente prima di continuare.'}
            {error === 'REQUEST_FAILED' && 'Errore durante l’avvio del pagamento.'}
          </div>
          {errorDetail ? <div className="mt-2 text-xs font-mono opacity-80">{errorDetail}</div> : null}
        </div>
      )}

      <button
        type="button"
        disabled={!isValid || loading}
        onClick={startCheckout}
        className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Reindirizzamento…' : 'Procedi al pagamento'}
      </button>

      <button
        type="button"
        onClick={() => router.back()}
        className="block text-sm font-semibold text-slate-400 hover:text-white"
      >
        ← Torna indietro
      </button>
    </div>
  );
}

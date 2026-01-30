'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/netlifyFunctions';

type CheckoutError = 'MISSING_PARAMS' | 'NOT_AUTHENTICATED' | 'REQUEST_FAILED';

export default function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();

  const tripId = useMemo(() => params.get('tripId'), [params]);
  const busRunId = useMemo(() => params.get('busRunId'), [params]);

  const [seats, setSeats] = useState(1);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);

  function buildAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sb_user_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const isValid = useMemo(() => !!tripId && !!busRunId && seats > 0, [tripId, busRunId, seats]);

  async function startCheckout() {
    setError(null);

    if (!tripId || !busRunId) {
      setError('MISSING_PARAMS');
      return;
    }

    const authHeaders = buildAuthHeaders();
    if (!authHeaders.Authorization) {
      setError('NOT_AUTHENTICATED');
      return;
    }

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };

      const response = await fetchJson('/.netlify/functions/stripe-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tripId, busRunId, seats, attendees }),
      });

      if (!response?.url) throw new Error('No checkout url');
      window.location.href = response.url;
    } catch {
      setError('REQUEST_FAILED');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <h1 className="text-3xl font-black tracking-tight text-white">Checkout</h1>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error === 'MISSING_PARAMS' && 'Dati mancanti per la prenotazione.'}
          {error === 'NOT_AUTHENTICATED' && 'Devi effettuare il login prima di continuare.'}
          {error === 'REQUEST_FAILED' && 'Errore durante l’avvio del pagamento.'}
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 space-y-4">
        <label className="block text-sm font-bold text-slate-300">Numero posti</label>
        <input
          type="number"
          min={1}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        />
      </div>

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

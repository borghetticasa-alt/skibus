'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

type TripDetail = {
  id: string;
  title?: string | null;
  destination?: string | null;
  trip_date?: string | null;
  base_price?: number | null;
  status?: string | null;
};

function euro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

async function safeJson(res: Response) {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { raw: txt };
  }
}

export default function CheckoutClient() {
  const sp = useSearchParams();
  const tripId = sp.get('tripId') || '';
  const busRunId = sp.get('busRunId') || ''; // lo lasciamo, anche se ora non è obbligatorio

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stripeLoading, setStripeLoading] = useState(false);

  // ====== Load trip detail (server calcola comunque l’importo per PayPal) ======
  useEffect(() => {
    if (!tripId) return;

    let alive = true;
    (async () => {
      setLoadingTrip(true);
      setError(null);
      try {
        const res = await fetch(`/api/public-api/get-trip-detail?id=${encodeURIComponent(tripId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await safeJson(res);
        if (!res.ok) throw new Error(json?.error || `Errore caricamento gita (HTTP ${res.status})`);

        // alcuni endpoint ritornano { data }, altri direttamente l’oggetto
        const t = (json?.data || json?.trip || json) as TripDetail;
        if (alive) setTrip(t);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Errore caricamento gita');
      } finally {
        if (alive) setLoadingTrip(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tripId]);

  const displayTitle = useMemo(() => {
    if (!trip) return 'Gita';
    return (trip.title || trip.destination || 'Gita') as string;
  }, [trip]);

  const displayPrice = useMemo(() => {
    const p = Number(trip?.base_price || 0);
    return Number.isFinite(p) ? p : 0;
  }, [trip]);

  async function startStripe() {
    if (!tripId) {
      setError('TripId mancante');
      return;
    }
    setStripeLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, busRunId }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || `Stripe error (HTTP ${res.status})`);

      const url = json?.url || json?.checkoutUrl;
      if (!url) throw new Error('Stripe: risposta senza url');

      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || 'Errore Stripe');
    } finally {
      setStripeLoading(false);
    }
  }

  if (!tripId) {
    return (
      <div className="mx-auto max-w-xl p-6 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xl font-black">Checkout</div>
          <div className="mt-2 text-sm text-slate-200/80">TripId mancante.</div>
          <div className="mt-4">
            <Link className="text-indigo-300 underline" href="/trips">
              Torna alle gite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  return (
    <div className="mx-auto max-w-2xl p-6 text-white">
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
          <div className="text-2xl font-black tracking-tight">Pagamento</div>
          <div className="mt-2 text-sm text-slate-200/70">
            Completa la prenotazione per: <span className="font-black text-white">{displayTitle}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <div className="text-xs font-black text-slate-200/70">Riepilogo</div>
              <div className="mt-2 text-sm text-slate-200/80">
                {loadingTrip ? (
                  <span>Caricamento…</span>
                ) : (
                  <>
                    Prezzo base: <span className="font-black text-white">{euro(displayPrice)}</span>
                    <div className="mt-1 text-xs text-slate-200/60">
                      (PayPal usa l’importo calcolato dal server, così non “impazzisce” con i formati)
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={startStripe}
              disabled={stripeLoading || loadingTrip}
              className="rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50"
            >
              {stripeLoading ? 'Apro Stripe…' : 'Paga con carta'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* PayPal */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
          <div className="text-lg font-black">PayPal</div>
          <div className="mt-1 text-sm text-slate-200/70">
            Seleziona PayPal: l’ordine viene creato dal server con importo in formato valido (es. “35.00”).
          </div>

          {!paypalClientId ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Manca NEXT_PUBLIC_PAYPAL_CLIENT_ID in .env.local
            </div>
          ) : (
            <div className="mt-4">
              <PayPalScriptProvider
                options={{
                  clientId: paypalClientId,
                  currency: 'EUR',
                  intent: 'CAPTURE',
                }}
              >
                <PayPalButtons
                  style={{ layout: 'vertical', label: 'paypal' }}
                  createOrder={async () => {
                    setError(null);
                    const res = await fetch('/api/paypal/create-order', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tripId, busRunId }),
                    });
                    const json = await safeJson(res);
                    if (!res.ok) {
                      throw new Error(json?.error || `PayPal create-order error (HTTP ${res.status})`);
                    }
                    const orderId = json?.orderId;
                    if (!orderId) throw new Error('PayPal: orderId mancante');
                    return orderId;
                  }}
                  onApprove={async (data) => {
                    setError(null);
                    const orderId = data?.orderID;
                    if (!orderId) {
                      setError('PayPal: orderID mancante');
                      return;
                    }

                    const res = await fetch('/api/paypal/capture-order', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId, tripId, busRunId }),
                    });

                    const json = await safeJson(res);
                    if (!res.ok) {
                      setError(json?.error || `PayPal capture error (HTTP ${res.status})`);
                      return;
                    }

                    // success → vai a pagina ok (se ce l’hai) oppure account
                    window.location.href = '/account';
                  }}
                  onError={(err) => {
                    console.error(err);
                    setError('PayPal: errore pagamento (controlla console)');
                  }}
                />
              </PayPalScriptProvider>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-200/60">
          TripId: <span className="font-mono">{tripId}</span>
          {busRunId ? (
            <>
              {' '}
              · BusRunId: <span className="font-mono">{busRunId}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

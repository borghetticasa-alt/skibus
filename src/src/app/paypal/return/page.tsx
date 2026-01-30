'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchJson } from '@/lib/netlifyFunctions';

export default function PayPalReturnPage() {
  const params = useSearchParams();
  const bookingId = params.get('booking');
  // PayPal rimanda l'order id nel parametro `token`
  const orderId = params.get('token');

  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Sto confermando il pagamento PayPal...');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setStatus('error');
          setMessage('Sessione non valida. Effettua il login e riprova.');
          return;
        }
        if (!bookingId || !orderId) {
          setStatus('error');
          setMessage('Parametri mancanti da PayPal.');
          return;
        }

        const json = await fetchJson('/.netlify/functions/paypal-capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId, bookingId }),
        });
if (!res.ok || !json?.success) {
          setStatus('error');
          setMessage('Pagamento non confermato. Se hai già pagato, contatta l’assistenza.');
          return;
        }

        setStatus('ok');
        setMessage('Pagamento confermato! Ti reindirizzo...');
        setTimeout(() => {
          window.location.href = `/dashboard?payment=success&provider=paypal&booking=${bookingId}`;
        }, 800);
      } catch (e) {
        setStatus('error');
        setMessage('Errore durante la conferma PayPal.');
      }
    })();
  }, [bookingId, orderId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
<<<<<<< HEAD
      <div className="max-w-md w-full bg-white/5 border border-slate-100 rounded-3xl shadow-sm p-8 space-y-3">
=======
      <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl shadow-sm p-8 space-y-3">
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
        <h1 className="text-2xl font-extrabold text-slate-900">PayPal</h1>
        <p className="text-slate-600">{message}</p>
        {status === 'error' && (
          <button
            onClick={() => (window.location.href = '/dashboard')}
            className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-bold"
          >
            Vai alla Dashboard
          </button>
        )}
      </div>
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import { ErrorModal } from '../../components/ui/ErrorModal';
import { ErrorCode } from '../../types/errors';

export default function CheckoutPage() {
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBooking = async () => {
    setLoading(true);
    setErrorStatus(null);

    try {
      const response = await fetch('/.netlify/functions/user-booking/create-seat-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busRunId: 'some-id', seats: 2 })
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        // Intercettiamo il codice errore dal formato standardizzato { success, error: { code, message } }
        setErrorStatus(data.error?.code || ErrorCode.INTERNAL_ERROR);
        return;
      }

      // Se successo, procedi a Stripe...
      console.log("Successo! Reindirizzamento...");
    } catch (err) {
      setErrorStatus(ErrorCode.INTERNAL_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type: 'retry' | 'waitlist' | 'restart') => {
    setErrorStatus(null);
    if (type === 'retry') {
      handleBooking();
    } else if (type === 'waitlist') {
      window.location.href = '/waitlist/join';
    } else if (type === 'restart') {
      window.location.reload();
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 min-h-screen flex flex-col justify-center">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight text-center">Checkout</h1>
        <p className="text-slate-500 text-center">Conferma i tuoi posti per lo SkiBus.</p>
        
        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Posti selezionati</span>
            <span className="font-bold">2 Adulti</span>
          </div>
        </div>

        <button 
          onClick={handleBooking}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-xl shadow-indigo-100"
        >
          {loading ? 'Verifica disponibilità...' : 'Paga Ora'}
        </button>
      </div>

      <ErrorModal 
        code={errorStatus} 
        onClose={() => setErrorStatus(null)}
        onAction={handleAction}
      />
    </div>
  );
}

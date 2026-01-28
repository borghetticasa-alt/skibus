'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ClientHome() {
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || '');
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 bg-hero text-white">
        <h1 className="text-3xl font-extrabold">Benvenuto 👋</h1>
        <p className="opacity-90">Sei loggato come {email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl p-6 card-glass">
          <h2 className="font-extrabold mb-2">Le tue prenotazioni</h2>
          <p className="text-slate-600 text-sm">
            Qui compariranno le gite prenotate, i partecipanti e lo stato.
          </p>
        </div>

        <div className="rounded-3xl p-6 card-glass">
          <h2 className="font-extrabold mb-2">Documenti & Biglietti</h2>
          <p className="text-slate-600 text-sm">
            QR code, conferme e aggiornamenti in tempo reale.
          </p>
        </div>
      </div>
    </div>
  );
}

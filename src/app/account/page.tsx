'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { LogOut, Ticket, ArrowRight, UserCircle } from 'lucide-react';

type BookingRow = {
  id: string;
  status: string;
  seats: number;
  created_at: string;
  trip_id?: string;
  bus_run_id?: string;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: uData } = await supabase.auth.getUser();
      const email = uData.user?.email || null;
      setUserEmail(email);

      if (!uData.user) {
        setLoading(false);
        return;
      }

      // Carica prenotazioni utente (RLS deve permettere select sulle proprie bookings)
      const { data, error } = await supabase
        .from('bookings')
        .select('id,status,seats,created_at,trip_id,bus_run_id')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setErr('Non riesco a leggere le prenotazioni. Controlla RLS su bookings.');
      } else {
        setBookings((data as any) || []);
      }

      setLoading(false);
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const hasBookings = bookings.length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl glass glow border border-white/10 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <UserCircle className="text-slate-100" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-300/70">Area Cliente</div>
              <div className="text-2xl md:text-3xl font-black tracking-tight text-white">
                {userEmail ? userEmail : 'Non loggato'}
              </div>
              <div className="text-sm text-slate-200/80">
                Qui trovi le tue prenotazioni.
              </div>
            </div>
          </div>

          {userEmail ? (
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
            >
              <LogOut size={16} />
              Esci
            </button>
          ) : (
            <Link
              href="/login?redirect=/account"
              className="btn-tech inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white"
            >
              Login <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>

      
<div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/30 p-6">
  <div className="text-sm font-black text-white mb-2">Regole di prenotazione</div>
  <ul className="text-sm text-slate-200/80 space-y-2 list-disc pl-5">
    <li>La prenotazione è valida solo dopo il pagamento.</li>
    <li>I posti vengono bloccati temporaneamente durante il checkout.</li>
    <li>Il bus viene confermato solo al raggiungimento del numero minimo.</li>
    <li>Annullamento gratuito fino alla data di conferma del bus.</li>
    <li>Dopo la conferma, la prenotazione non è rimborsabile.</li>
  </ul>
</div>


      <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-white">Le tue prenotazioni</div>
            <div className="text-xs text-slate-300/70">Storico recente</div>
          </div>
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
          >
            <Ticket size={16} />
            Prenota una gita
          </Link>
        </div>

        {loading && <div className="mt-4 text-slate-200/80">Caricamento…</div>}

        {!loading && !userEmail && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            Devi fare login per vedere le tue prenotazioni.
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
            {err}
          </div>
        )}

        {!loading && userEmail && !err && (
          <div className="mt-4 space-y-3">
            {!hasBookings ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200/80">
                Nessuna prenotazione trovata (ancora).
              </div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="font-black text-white">Booking #{b.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-slate-300/80">
                      {new Date(b.created_at).toLocaleString('it-IT')}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-slate-100">
                      Stato: <b className="ml-1">{b.status}</b>
                    </span>
                    <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-slate-100">
                      Posti: <b className="ml-1">{b.seats}</b>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

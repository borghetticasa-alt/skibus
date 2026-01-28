'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorModal } from '../../components/ui/ErrorModal';
import { ErrorCode } from '../../types/errors';
import { supabase } from '@/lib/supabaseClient';
import { fetchJson } from '@/lib/netlifyFunctions';


type TripMedia = { trip_id: string; skirama_url?: string | null; weather_query?: string | null };

type ForecastDay = { date: string; tMax: number; tMin: number; precipProb: number; weatherCode: number };

function wcLabel(code: number) {
  // versione semplice (non esaustiva)
  if (code === 0) return 'Sereno';
  if ([1,2,3].includes(code)) return 'Variabile';
  if ([45,48].includes(code)) return 'Nebbia';
  if ([51,53,55,56,57].includes(code)) return 'Pioggerella';
  if ([61,63,65,66,67].includes(code)) return 'Pioggia';
  if ([71,73,75,77].includes(code)) return 'Neve';
  if ([80,81,82].includes(code)) return 'Rovesci';
  if ([95,96,99].includes(code)) return 'Temporali';
  return 'Meteo';
}


type Attendee = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

function isEmailLike(v: string) {
  return /\S+@\S+\.[A-Za-z]{2,}/.test(v);
}

export default function CheckoutPage() {
  const params = useSearchParams();

  const tripId = params.get('tripId');
  const busRunId = params.get('busRunId');

  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [availability, setAvailability] = useState<{ capacity: number; sold: number; held: number; available: number } | null>(null);
  const [tripMedia, setTripMedia] = useState<TripMedia | null>(null);
  const [forecast, setForecast] = useState<{ query: string; days: ForecastDay[] } | null>(null);
  const [seats, setSeats] = useState<number>(() => {
    const n = Number(params.get('seats') || 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  const [attendees, setAttendees] = useState<Attendee[]>(() => Array.from({ length: Math.max(1, seats) }, () => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })));

  // Mantiene array partecipanti lungo quanto seats
  useEffect(() => {
    setAttendees(prev => {
      const next = [...prev];
      if (next.length < seats) {
        while (next.length < seats) next.push({ firstName: '', lastName: '', email: '', phone: '' });
      } else if (next.length > seats) {
        next.length = seats;
      }
      return next;
    });
  }, [seats]);

  // Session token
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token || null;
      setToken(accessToken);
    })();
  }, []);

  const authHeaders = useMemo(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  // Fetch skirama + meteo per questa gita
  useEffect(() => {
    if (!tripId) return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`/.netlify/functions/trip-media-get?tripId=${encodeURIComponent(tripId)}`);
        const m = await r.json();
        if (!alive) return;
        if (r.ok) setTripMedia(m);
      } catch {/* ignore */}
    };

    load();
    return () => { alive = false; };
  }, [tripId]);

  useEffect(() => {
    if (!tripMedia?.weather_query) return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`/.netlify/functions/weather-5day?q=${encodeURIComponent(tripMedia.weather_query || '')}`);
        const d = await r.json();
        if (!alive) return;
        if (r.ok) setForecast({ query: d.query, days: d.days || [] });
      } catch {/* ignore */}
    };

    load();
    return () => { alive = false; };
  }, [tripMedia?.weather_query]);

  // Fetch availability (poll leggero)
  useEffect(() => {
    if (!busRunId) return;
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch(`/.netlify/functions/busrun-availability?busRunId=${busRunId}`);
        const data = await res.json();
        if (!alive) return;
        if (res.ok) {
          setAvailability({ capacity: data.capacity, sold: data.sold, held: data.held, available: data.available });
        }
      } catch {
        // silent
      }
    };

    load();
    const t = setInterval(load, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [busRunId]);

  // Se availability scende sotto seats, scala automaticamente
  useEffect(() => {
    if (!availability) return;
    if (availability.available > 0 && seats > availability.available) {
      setSeats(availability.available);
    }
  }, [availability, seats]);

  const canProceedBase = useMemo(() => {
    if (!tripId || !busRunId) return false;
    if (!Number.isFinite(seats) || seats < 1) return false;
    if (availability && seats > availability.available) return false;
    return true;
  }, [tripId, busRunId, seats, availability]);

  const attendeesValid = useMemo(() => {
    if (!attendees || attendees.length !== seats) return false;
    return attendees.every(a =>
      a.firstName.trim().length > 0 &&
      a.lastName.trim().length > 0 &&
      isEmailLike(a.email.trim()) &&
      a.phone.trim().length >= 6
    );
  }, [attendees, seats]);

  const isValid = canProceedBase && attendeesValid;

  const updateAttendee = (i: number, patch: Partial<Attendee>) => {
    setAttendees(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  };

  const copyBookerToFirst = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email || '';
      if (!email) return;
      setAttendees(prev => {
        const next = [...prev];
        next[0] = { ...next[0], email };
        return next;
      });
    } catch { /* ignore */ }
  };

  const handleCard = async () => {
    setLoading(true);
    setErrorStatus(null);

    try {
      if (!tripId || !busRunId) {
        setErrorStatus(ErrorCode.INVALID_INPUT);
        return;
      }
      if (!token) {
        setErrorStatus(ErrorCode.UNAUTHORIZED);
        return;
      }
      if (!isValid) {
        setErrorStatus(ErrorCode.INVALID_INPUT);
        return;
      }

      const response = await fetchJson('/.netlify/functions/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ tripId, busRunId, seats, attendees })
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        setErrorStatus(ErrorCode.INTERNAL_ERROR);
        return;
      }

      window.location.href = data.url;
    } catch {
      setErrorStatus(ErrorCode.INTERNAL_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPal = async () => {
    setLoading(true);
    setErrorStatus(null);

    try {
      if (!tripId || !busRunId) {
        setErrorStatus(ErrorCode.INVALID_INPUT);
        return;
      }
      if (!token) {
        setErrorStatus(ErrorCode.UNAUTHORIZED);
        return;
      }
      if (!isValid) {
        setErrorStatus(ErrorCode.INVALID_INPUT);
        return;
      }

      const data = await fetchJson('/.netlify/functions/paypal-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ tripId, busRunId, seats, attendees })
      });
if (!res.ok || !data?.approveLink) {
        setErrorStatus(ErrorCode.INTERNAL_ERROR);
        return;
      }

      window.location.href = data.approveLink;
    } catch {
      setErrorStatus(ErrorCode.INTERNAL_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type: 'retry' | 'waitlist' | 'restart') => {
    setErrorStatus(null);
    if (type === 'retry') {
      handleCard();
    } else if (type === 'waitlist') {
      window.location.href = '/waitlist/join';
    } else if (type === 'restart') {
      window.location.reload();
    }
  };

  const maxSeats = availability?.available ?? 60;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 min-h-screen flex flex-col justify-center">
      <div className="glass glow p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight text-center">Checkout</h1>
        <p className="text-slate-200/80 text-center">Inserisci i dati di ogni partecipante e conferma i tuoi posti.</p>

        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950/30 rounded-2xl border border-dashed border-slate-200">
          <div className="text-sm">
            <div className="text-slate-200/80">Posti disponibili</div>
            <div className="font-extrabold text-white">{availability ? availability.available : '...'}</div>
          </div>
          <div className="text-sm text-right">
            <div className="text-slate-200/80">Posti selezionati</div>
            <div className="font-extrabold text-white">{seats} posti</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">

        <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-bold text-white">Skirama</div>
            <div className="text-xs text-slate-300/70">{tripMedia?.skirama_url ? 'Caricato' : 'Non disponibile'}</div>
          </div>
          {tripMedia?.skirama_url ? (
            <img src={tripMedia.skirama_url} alt="Skirama" className="w-full rounded-2xl border border-white/10" />
          ) : (
            <div className="text-sm text-slate-200/70">Lo skirama verrà pubblicato dall’admin per questa gita.</div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-bold text-white">Meteo 5 giorni</div>
            <div className="text-xs text-slate-300/70">{forecast?.query || (tripMedia?.weather_query || '—')}</div>
          </div>
          {forecast?.days?.length ? (
            <div className="space-y-2">
              {forecast.days.map((d, i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <div className="text-slate-100">
                    {new Date(d.date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    <span className="ml-2 text-xs text-slate-300/70">{wcLabel(d.weatherCode)}</span>
                  </div>
                  <div className="text-slate-100 font-semibold">
                    {Math.round(d.tMin)}° / {Math.round(d.tMax)}°
                    <span className="ml-2 text-xs text-slate-300/70">💧{d.precipProb ?? 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-200/70">
              {tripMedia?.weather_query ? 'Caricamento previsioni…' : 'Il luogo meteo non è impostato dall’admin.'}
            </div>
          )}
        </div>

        </div>

        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-white/10">
          <div>
            <div className="font-bold text-white">Numero partecipanti</div>
            <div className="text-sm text-slate-200/80">Max = posti disponibili</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 rounded-xl border border-white/10 hover:bg-slate-950/30 font-bold disabled:opacity-50"
              disabled={loading || seats <= 1}
              onClick={() => setSeats(s => Math.max(1, s - 1))}
              type="button"
            >
              −
            </button>
            <div className="w-14 text-center font-extrabold">{seats}</div>
            <button
              className="w-10 h-10 rounded-xl border border-white/10 hover:bg-slate-950/30 font-bold disabled:opacity-50"
              disabled={loading || seats >= maxSeats}
              onClick={() => setSeats(s => Math.min(maxSeats, s + 1))}
              type="button"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="font-bold text-white">Dati partecipanti</div>
          <button
            type="button"
            onClick={copyBookerToFirst}
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
          >
            Copia email account nel partecipante 1
          </button>
        </div>

        <div className="space-y-4">
          {attendees.map((a, i) => (
            <div key={i} className="p-4 rounded-2xl border border-white/10">
              <div className="font-bold text-white mb-3">Partecipante {i + 1}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Nome"
                  value={a.firstName}
                  onChange={(e) => updateAttendee(i, { firstName: e.target.value })}
                />
                <input
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Cognome"
                  value={a.lastName}
                  onChange={(e) => updateAttendee(i, { lastName: e.target.value })}
                />
                <input
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Email"
                  value={a.email}
                  onChange={(e) => updateAttendee(i, { email: e.target.value })}
                />
                <input
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Cellulare"
                  value={a.phone}
                  onChange={(e) => updateAttendee(i, { phone: e.target.value })}
                />
              </div>
              <div className="text-xs text-slate-200/80 mt-2">
                {(!a.firstName || !a.lastName || !isEmailLike(a.email) || a.phone.trim().length < 6) ? 'Compila tutti i campi (email valida + telefono).' : 'OK'}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={handleCard}
            disabled={loading || !isValid}
            className="w-full btn-tech text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-xl shadow-indigo-100"
          >
            {loading ? 'Avvio pagamento...' : 'Paga con Carta (Stripe)'}
          </button>

          <button
            onClick={handlePayPal}
            disabled={loading || !isValid}
            className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? 'Avvio PayPal...' : 'Paga con PayPal'}
          </button>

          {!token && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl p-3">
              Devi essere loggato per pagare (sessione Supabase).
            </div>
          )}
        </div>
      </div>

      <ErrorModal
        code={errorStatus}
        onClose={() => setErrorStatus(null)}
        onAction={handleAction}
      />
    </div>
  );
}

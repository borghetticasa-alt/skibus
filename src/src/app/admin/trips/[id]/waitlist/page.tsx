'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TripLayout, TripStatus, SlaLevel } from '@/components/admin/TripLayout';

type TipoBus = 'PICCOLO' | 'MEDIO' | 'GRANDE';

type ConfigBus = {
  tipo: TipoBus;
  nome: string;
  posti: number;
  costo: number;
};

type BusOperativo = {
  id: string;
  ordine: number; // 1,2,3,4...
  tipo: TipoBus;
  nome: string;
  posti: number;
  venduti: number;
  stato: 'IN_PRENOTAZIONE' | 'PIENO';
};

type StatoWaitlist = 'IN_CODA' | 'INVITATO' | 'SCADUTO';

type RigaCoda = {
  id: string;
  creatoISO: string;
  nomeMascherato: string;
  postiRichiesti: number;
  stato: StatoWaitlist;
};

function euro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function ceilPos(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.ceil(n));
}

function pill(stato: StatoWaitlist) {
  if (stato === 'INVITATO') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (stato === 'SCADUTO') return 'bg-rose-100 text-rose-700 border-rose-200';
<<<<<<< HEAD
  return 'bg-white/5/5 text-slate-200/80 border-white/10';
=======
  return 'bg-white/5 text-slate-200/80 border-white/10';
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
}

/**
 * FASE 2:
 * - Lista d’attesa attiva SOLO quando il bus #1 è pieno
 * - La lista d’attesa serve per decidere bus #2/#3/#4…
 * - Scelta bus aggiuntivo: PICCOLO -> MEDIO -> GRANDE in base ai pax richiesti
 * - UX: chiarissimo all’utente finale cosa succede e quando
 */
export default function WaitlistPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? 'mr-001';

  // Evita mismatch hydration (date/locale)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- Config (puoi renderla dinamica dopo) ---
  const [nomeDestinazione] = useState('Gressoney-La-Trinité');
  const [dataPartenzaISO] = useState('2026-01-18T07:00:00Z');

  // prezzi: (qui li mettiamo solo come info “coerente” col progetto)
  const [prezzoClienteTotale] = useState(70);
  const [costoSkipass] = useState(53);

  // Flotta configurabile (come in Numbers)
  const [configBus] = useState<ConfigBus[]>([
    { tipo: 'PICCOLO', nome: 'Bus piccolo', posti: 14, costo: 250 },
    { tipo: 'MEDIO', nome: 'Bus medio', posti: 25, costo: 500 },
    { tipo: 'GRANDE', nome: 'Bus grande', posti: 52, costo: 1000 },
  ]);

  // --- Stato operativo dei bus (mock “vero” per UI) ---
  // NB: bus #1 è quello “principale” che va venduto; quando PIENO, parte waitlist
  const [busOperativi, setBusOperativi] = useState<BusOperativo[]>([
    { id: 'BUS-1', ordine: 1, tipo: 'GRANDE', nome: 'Bus grande', posti: 52, venduti: 52, stato: 'PIENO' }, // <-- metti 52 per test
  ]);

  // Waitlist (mock)
  const [coda, setCoda] = useState<RigaCoda[]>([
    { id: 'WL-001', creatoISO: '2025-10-25T10:30:00Z', nomeMascherato: 'Ma*** Va***', postiRichiesti: 4, stato: 'IN_CODA' },
    { id: 'WL-002', creatoISO: '2025-10-25T11:15:00Z', nomeMascherato: 'Sa*** Bi***', postiRichiesti: 2, stato: 'IN_CODA' },
    { id: 'WL-003', creatoISO: '2025-10-25T09:00:00Z', nomeMascherato: 'Lu*** Ro***', postiRichiesti: 1, stato: 'IN_CODA' },
  ]);

  const bus1 = useMemo(() => busOperativi.find(b => b.ordine === 1), [busOperativi]);
  const waitlistAttiva = useMemo(() => (bus1?.stato === 'PIENO'), [bus1?.stato]);

  const paxInCoda = useMemo(() => {
    return coda.filter(r => r.stato === 'IN_CODA').reduce((acc, r) => acc + r.postiRichiesti, 0);
  }, [coda]);

  // Scelta del bus più piccolo che “copre” il fabbisogno, con logica PICCOLO->MEDIO->GRANDE
  const propostaBusAggiuntivo = useMemo(() => {
    if (!waitlistAttiva) return null;
    if (paxInCoda <= 0) return null;

    const picc = configBus.find(b => b.tipo === 'PICCOLO');
    const med = configBus.find(b => b.tipo === 'MEDIO');
    const gran = configBus.find(b => b.tipo === 'GRANDE');

    // scegli il più piccolo sufficiente
    if (picc && paxInCoda <= picc.posti) return picc;
    if (med && paxInCoda <= med.posti) return med;
    return gran ?? med ?? picc ?? null;
  }, [waitlistAttiva, paxInCoda, configBus]);

  const numeroBusSuccessivo = useMemo(() => {
    const maxOrd = busOperativi.reduce((m, b) => Math.max(m, b.ordine), 1);
    return maxOrd + 1;
  }, [busOperativi]);

  // KPI e riepilogo (TripLayout)
  const statoGita: StatoGita = useMemo(() => {
    // Qui la gita può essere “CONFERMATA/IN_ATTESA” per ora la lasciamo informativa.
    // La regola vera sta nella pagina Numeri.
    return waitlistAttiva ? 'IN_ATTESA' : 'IN_ATTESA';
  }, [waitlistAttiva]);

  const riepilogo: RiepilogoGita = useMemo(() => {
    const livello: LivelloSla = 'VERDE';
    const etichetta = waitlistAttiva ? "Lista d'attesa attiva" : "Lista d'attesa non attiva";

    return {
      nomeDestinazione,
      etichettaPartenza: mounted
        ? `${new Date(dataPartenzaISO).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        : '—',
      stato: statoGita,
      sla: { livello, etichetta },
    };
  }, [mounted, nomeDestinazione, dataPartenzaISO, statoGita, waitlistAttiva]);

  // --- Azioni (mock) ---
  function attivaBusAggiuntivo() {
    if (!propostaBusAggiuntivo) return;

    const nuovo: BusOperativo = {
      id: `BUS-${numeroBusSuccessivo}`,
      ordine: numeroBusSuccessivo,
      tipo: propostaBusAggiuntivo.tipo,
      nome: propostaBusAggiuntivo.nome,
      posti: propostaBusAggiuntivo.posti,
      venduti: 0,
      stato: 'IN_PRENOTAZIONE',
    };

    setBusOperativi(prev => [...prev, nuovo]);

    // In fase 2: la waitlist resta “memoria domanda”.
    // In fase 3: potremo trasformare “IN_CODA” in “INVITATO” legato al bus #2.
  }

  function toggleBus1Pieno() {
    // helper per test UI: se vuoi vedere la waitlist on/off
    setBusOperativi(prev =>
      prev.map(b => {
        if (b.ordine !== 1) return b;
        const pieno = b.stato === 'PIENO';
        return {
          ...b,
          stato: pieno ? 'IN_PRENOTAZIONE' : 'PIENO',
          venduti: pieno ? Math.max(0, b.posti - 3) : b.posti,
        };
      })
    );
  }

  return (
    <TripLayout
      id={id}
      activeTab="waitlist"
      riepilogo={riepilogo}
      badges={{
        waitlist: waitlistAttiva ? { testo: 'ON', tono: 'warn' } : { testo: 'OFF', tono: 'neutro' },
      }}
    >
      <div className="space-y-8">

        {/* Header operativo */}
        <div className="bg-slate-950/30 rounded-[32px] border border-white/10  p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fase 2</div>
              <h2 className="text-2xl font-black tracking-tight text-white mt-2">
                Lista d’attesa = bus aggiuntivi (2°, 3°, 4°…)
              </h2>
              <p className="text-sm font-semibold text-slate-300/70 mt-2 leading-relaxed max-w-3xl">
                Regola semplice: <b>finché il bus #1 non è pieno</b>, la lista d’attesa è spenta.
                Quando il bus #1 è pieno, la domanda extra finisce in coda e serve per decidere se attivare un
                <b> bus aggiuntivo</b>, scegliendo la capienza migliore (piccolo → medio → grande).
              </p>
            </div>

            {/* Bottone test (puoi toglierlo dopo) */}
            <button
              type="button"
              onClick={toggleBus1Pieno}
<<<<<<< HEAD
              className="px-5 py-3 rounded-2xl bg-white/5/50 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
=======
              className="px-5 py-3 rounded-2xl bg-white/50 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
            >
              Test: toggle bus #1 pieno
            </button>
          </div>
        </div>

        {/* Stato bus */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {busOperativi.map((b) => {
            const pieno = b.stato === 'PIENO';
            const perc = Math.min(100, (b.venduti / Math.max(1, b.posti)) * 100);

            return (
              <div key={b.id} className="bg-slate-950/30 rounded-[32px] border border-white/10  p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Bus #{b.ordine}
                    </div>
                    <div className="mt-2 text-xl font-black text-white tracking-tight">
                      {b.nome}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-300/70">
                      {b.venduti} / {b.posti} posti
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    pieno ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                    {pieno ? 'PIENO' : 'IN PRENOTAZIONE'}
                  </span>
                </div>

                <div className="mt-6">
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${perc}%` }} />
                  </div>
                  <div className="mt-3 text-xs font-semibold text-slate-400">
                    Prezzo cliente: <b className="text-white">{euro(prezzoClienteTotale)}</b> (include skipass {euro(costoSkipass)})
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Blocco waitlist (UX chiara) */}
        <div className={`rounded-[32px] border  p-8 ${
          waitlistAttiva ? 'bg-slate-950/30 border-white/10' : 'bg-slate-950/30 border-white/10'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Lista d’attesa
              </div>

              <h3 className="text-xl font-black text-white tracking-tight mt-2">
                {waitlistAttiva ? 'Attiva (bus #1 pieno)' : 'Non attiva (prima riempi il bus #1)'}
              </h3>

              <p className="text-sm font-semibold text-slate-300/70 mt-2 max-w-3xl leading-relaxed">
                {waitlistAttiva
                  ? 'Ora la domanda extra entra in coda e può far scattare bus aggiuntivi.'
                  : 'La coda è disabilitata perché devi prima completare le prenotazioni del bus principale.'}
              </p>
            </div>

<<<<<<< HEAD
            <div className="bg-white/5/50 text-white rounded-[28px] p-6 min-w-[280px]">
=======
            <div className="bg-white/50 text-white rounded-[28px] p-6 min-w-[280px]">
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
              <div className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Domanda in coda
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-5xl font-black tracking-tighter">{paxInCoda}</span>
                <span className="text-sm font-black uppercase tracking-widest text-white/70">posti</span>
              </div>
              <div className="mt-4 text-xs font-semibold text-white/70 leading-relaxed">
                {waitlistAttiva
                  ? 'Se i posti in coda sono sufficienti, puoi attivare un nuovo bus.'
                  : 'Quando il bus #1 è pieno, questo contatore diventa operativo.'}
              </div>
            </div>
          </div>

          {/* Proposta bus aggiuntivo */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-[28px] border p-6 ${
              waitlistAttiva ? 'bg-slate-950/30 border-white/10' : 'bg-slate-950/30 border-white/10 opacity-50'
            }`}>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Proposta bus aggiuntivo
              </div>

              <div className="mt-3 text-lg font-black text-white">
                {propostaBusAggiuntivo ? propostaBusAggiuntivo.nome : 'Nessuna proposta'}
              </div>

              <div className="mt-2 text-sm font-semibold text-slate-300/70">
                {propostaBusAggiuntivo
                  ? `Capienza: ${propostaBusAggiuntivo.posti} • Costo: ${euro(propostaBusAggiuntivo.costo)}`
                  : waitlistAttiva
                    ? 'Serve almeno 1 posto in coda.'
                    : 'La proposta si attiva solo a bus #1 pieno.'}
              </div>

              <button
                type="button"
                disabled={!waitlistAttiva || !propostaBusAggiuntivo}
                onClick={attivaBusAggiuntivo}
                className={`mt-5 w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  (!waitlistAttiva || !propostaBusAggiuntivo)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                }`}
              >
                Attiva bus #{numeroBusSuccessivo}
              </button>

              <div className="mt-3 text-xs font-semibold text-slate-400">
                Regola scelta bus: <b className="text-white">piccolo → medio → grande</b> (il più piccolo che copre la domanda).
              </div>
            </div>

            {/* Tabella coda */}
            <div className={`rounded-[28px] border p-6 ${
              waitlistAttiva ? 'bg-slate-950/30 border-white/10' : 'bg-slate-950/30 border-white/10 opacity-50'
            }`}>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Dettaglio coda
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950/30 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-4 py-3">Utente</th>
                      <th className="px-4 py-3 text-center">Posti</th>
                      <th className="px-4 py-3">Stato</th>
                      <th className="px-4 py-3 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coda.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-950/30">
                        <td className="px-4 py-3">
                          <div className="text-sm font-black text-white">{r.nomeMascherato}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.id}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-black text-white">{r.postiRichiesti}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${pill(r.stato)}`}>
                            {r.stato.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-slate-300/70">
                          {mounted ? new Date(r.creatoISO).toLocaleDateString('it-IT') : '—'}
                        </td>
                      </tr>
                    ))}
                    {coda.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-sm font-semibold text-slate-300/70" colSpan={4}>
                          Nessun record in coda.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-xs font-semibold text-slate-400 leading-relaxed">
                In questa fase i record restano “IN_CODA” come memoria di domanda.
                Nella fase successiva li useremo per inviti/pagamenti mirati sul bus #2.
              </div>
            </div>
          </div>

          {/* Nota UX cliente */}
<<<<<<< HEAD
          <div className="mt-8 bg-white/5/50 text-white rounded-[28px] p-6">
=======
          <div className="mt-8 bg-white/50 text-white rounded-[28px] p-6">
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Messaggio chiaro per il cliente</div>
            <div className="mt-3 text-sm font-semibold leading-relaxed text-white/85">
              Le prenotazioni si fanno <b>solo pagando</b>. Se il bus è pieno, puoi entrare in <b>lista d’attesa</b>:
              se si raggiunge abbastanza richiesta, attiviamo un bus aggiuntivo per la stessa data e modalità.
              Non puoi annullare la prenotazione dalla tua area (annullamenti li gestisce l’organizzatore).
            </div>
          </div>
        </div>

      </div>
    </TripLayout>
  );
}
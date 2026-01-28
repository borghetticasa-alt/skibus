'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TripLayout, TripStatus, SlaLevel } from '@/components/admin/TripLayout';

/* =========================
   TIPI
========================= */

type StatoGita = 'BOZZA' | 'IN_ATTESA' | 'CONFERMATA' | 'BLOCCATA' | 'PIENA' | 'ANNULLATA';
type TipoBus = 'PICCOLO' | 'MEDIO' | 'GRANDE';

type ConfigBus = {
  tipo: TipoBus;
  attivo: boolean;
  posti: number;
  costo: number;
};

type ConfigExtra = {
  skipass: { costo: number }; // sempre costo
  assicurazione: { attiva: boolean; costo: number };
  noleggio: { attivo: boolean; costo: number; prezzo: number }; // costo + prezzo vendita (markup)
};

type RigaBus = {
  numeroBus: number; // 1,2,3...
  tipo: TipoBus;
  posti: number;
  iscritti: number;
  costoBus: number;

  ricavoUnitarioLordo: number;
  costiUnitari: number;
  ricaviTotali: number;
  costiTotali: number;
  margine: number;

  regolaTempoOk: boolean;
  regolaMargineOk: boolean;
  regolaMin21Ok: boolean; // solo Bus 1

  confermabile: boolean;
  pieno: boolean;

  noteDecisione: string;
};

function clampInt(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

function formatEuro(n: number) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}€ ${abs.toFixed(0)}`;
}

function labelBus(t: TipoBus) {
  if (t === 'PICCOLO') return 'Bus piccolo';
  if (t === 'MEDIO') return 'Bus medio';
  return 'Bus grande';
}

function ordineBusPerTaglia(t: TipoBus) {
  if (t === 'PICCOLO') return 1;
  if (t === 'MEDIO') return 2;
  return 3;
}

/* =========================
   PAGINA
========================= */

export default function NumbersPage() {
  const { id } = useParams<{ id: string }>();

  // business
  const [prezzoCliente, setPrezzoCliente] = useState<number>(70); // Gressoney 70€
  const [margineMinimo, setMargineMinimo] = useState<number>(300);
  const [giorniLimiteAgenzia, setGiorniLimiteAgenzia] = useState<number>(4);

  // iscritti (simulazione)
  const [iscrittiTotali, setIscrittiTotali] = useState<number>(0);

  // tempo (evito Date.now per hydration)
  const [simulaTempoOk, setSimulaTempoOk] = useState<boolean>(true);

  // bus configurabili
  const [bus, setBus] = useState<ConfigBus[]>([
    { tipo: 'PICCOLO', attivo: true, posti: 14, costo: 250 },
    { tipo: 'MEDIO', attivo: true, posti: 25, costo: 500 },
    { tipo: 'GRANDE', attivo: true, posti: 52, costo: 1000 },
  ]);

  // extra
  const [extra, setExtra] = useState<ConfigExtra>({
    skipass: { costo: 53 },
    assicurazione: { attiva: false, costo: 0 },
    noleggio: { attivo: false, costo: 0, prezzo: 0 },
  });

  const riepilogo = useMemo(
    () => ({
      nomeDestinazione: 'Gressoney',
      stato: 'IN_ATTESA' as StatoGita,
    }),
    []
  );

  function toggleBus(tipo: TipoBus) {
    setBus(prev => prev.map(b => (b.tipo === tipo ? { ...b, attivo: !b.attivo } : b)));
  }

  function updateBus(tipo: TipoBus, patch: Partial<ConfigBus>) {
    setBus(prev => prev.map(b => (b.tipo === tipo ? { ...b, ...patch } : b)));
  }

  const calcolo = useMemo(() => {
    const iscritti = clampInt(iscrittiTotali);

    // bus attivi validi ordinati
    const busAttivi = bus
      .filter(b => b.attivo && b.posti > 0 && b.costo >= 0)
      .sort((a, b) => a.posti - b.posti);

    if (busAttivi.length === 0) {
      return {
        righe: [] as RigaBus[],
        waitlist: iscritti,
        waitlistAttiva: iscritti > 0,
        ricavoUnitarioLordo: 0,
        costiUnitari: 0,
        note: 'Nessun bus attivo: attiva almeno un bus.',
      };
    }

    // extra costi
    const costoSkipass = Math.max(0, extra.skipass.costo);
    const costoAss = extra.assicurazione.attiva ? Math.max(0, extra.assicurazione.costo) : 0;

    const costoNoleggio = extra.noleggio.attivo ? Math.max(0, extra.noleggio.costo) : 0;
    const prezzoNoleggio = extra.noleggio.attivo ? Math.max(0, extra.noleggio.prezzo) : 0;

    // ricavo/costi unitari
    const ricavoUnitarioLordo = prezzoCliente + (extra.noleggio.attivo ? prezzoNoleggio : 0);
    const costiUnitari = costoSkipass + costoAss + (extra.noleggio.attivo ? costoNoleggio : 0);

    // --- Funzione: calcola margine di un bus con X iscritti
    const calcMargine = (costoBus: number, iscrittiBus: number) => {
      const ricaviTotali = iscrittiBus * ricavoUnitarioLordo;
      const costiTotali = iscrittiBus * costiUnitari + costoBus;
      return { ricaviTotali, costiTotali, margine: ricaviTotali - costiTotali };
    };

    // --- Funzione: verifica regole per un bus (Bus 1 ha anche min 21)
    const regoleOk = (numeroBus: number, margine: number, iscrittiBus: number) => {
      const regolaTempoOk = simulaTempoOk;
      const regolaMargineOk = margine >= margineMinimo;
      const regolaMin21Ok = numeroBus !== 1 || iscrittiBus >= 21;
      const confermabile = regolaTempoOk && regolaMargineOk && regolaMin21Ok;
      return { regolaTempoOk, regolaMargineOk, regolaMin21Ok, confermabile };
    };

    // --- STATE MACHINE:
    // - c'è un bus corrente
    // - se over capienza: se regole OK -> upgrade al prossimo bus (senza “tenere” quello precedente)
    // - se al max bus e pieno e regole OK -> crea bus successivo
    // - altrimenti waitlist ON

    const righe: RigaBus[] = [];
    let rimanenti = iscritti;

    // helper: trova la “catena” di taglie disponibili ordinata per capienza/taglia
    const catena = [...busAttivi].sort((a, b) => ordineBusPerTaglia(a.tipo) - ordineBusPerTaglia(b.tipo));

    const maxIdx = catena.length - 1;

    let numeroBus = 1;

    while (rimanenti > 0) {
      // bus corrente parte dal più piccolo disponibile
      let idxCorrente = 0;

      // proviamo a scegliere la taglia minima che “può” contenere gli iscritti che vogliono entrare ORA
      // ma l'upgrade lo facciamo SOLO quando serve (cioè quando rimanenti supera la capienza corrente)
      // e SOLO se le regole risultano OK sulla taglia successiva (o quella selezionata).
      let iscrittiBus = Math.min(rimanenti, catena[idxCorrente].posti);

      // calcolo iniziale su taglia corrente
      let { ricaviTotali, costiTotali, margine } = calcMargine(catena[idxCorrente].costo, iscrittiBus);
      let rules = regoleOk(numeroBus, margine, iscrittiBus);

      // --- Se rimanenti eccedono la capienza corrente:
      // proviamo ad UPGRARE finché:
      // - esiste una taglia successiva
      // - serve più capienza (rimanenti > postiCorrenti)
      // - e le regole risultano OK con la nuova taglia (per il numero di persone che entrerebbero in quel bus)
      while (
        idxCorrente < maxIdx &&
        rimanenti > catena[idxCorrente].posti
      ) {
        const idxProssimo = idxCorrente + 1;
        const postiProssimo = catena[idxProssimo].posti;

        // se passiamo al bus più grande, possiamo far entrare più persone (fino alla sua capienza)
        const iscrittiProssimo = Math.min(rimanenti, postiProssimo);

        const test = calcMargine(catena[idxProssimo].costo, iscrittiProssimo);
        const rulesProssimo = regoleOk(numeroBus, test.margine, iscrittiProssimo);

        // upgrade solo se regole OK
        if (!rulesProssimo.confermabile) break;

        // upgrade accettato: “non consideriamo più” il bus precedente
        idxCorrente = idxProssimo;
        iscrittiBus = iscrittiProssimo;
        ricaviTotali = test.ricaviTotali;
        costiTotali = test.costiTotali;
        margine = test.margine;
        rules = rulesProssimo;
      }

      const cfg = catena[idxCorrente];
      const pieno = iscrittiBus >= cfg.posti;

      // nota decisione (spiegazione chiara per utente finale)
      let noteDecisione = '';
      if (!rules.confermabile) {
        if (!rules.regolaTempoOk) noteDecisione = `Non confermabile: fuori tempo (soglia agenzia ${giorniLimiteAgenzia} giorni prima).`;
        else if (!rules.regolaMin21Ok) noteDecisione = 'Non confermabile: per il primo bus serve minimo 21 persone.';
        else noteDecisione = 'Non confermabile: margine insufficiente.';
      } else {
        // confermabile
        if (idxCorrente > 0) {
          noteDecisione = `Upgrade: passaggio a ${labelBus(cfg.tipo)} perché le regole sono OK e serve più capienza.`;
        } else {
          noteDecisione = 'Confermabile sulla taglia attuale.';
        }
      }

      righe.push({
        numeroBus,
        tipo: cfg.tipo,
        posti: cfg.posti,
        iscritti: iscrittiBus,
        costoBus: cfg.costo,
        ricavoUnitarioLordo,
        costiUnitari,
        ricaviTotali,
        costiTotali,
        margine,
        regolaTempoOk: rules.regolaTempoOk,
        regolaMargineOk: rules.regolaMargineOk,
        regolaMin21Ok: rules.regolaMin21Ok,
        confermabile: rules.confermabile,
        pieno,
        noteDecisione,
      });

      // consumiamo iscritti assegnati
      rimanenti -= iscrittiBus;

      // Se il bus corrente NON è pieno -> ci sono posti, quindi non può esistere waitlist
      if (!pieno) {
        // anche se ci sarebbero “rimanenti”, in realtà non può succedere perché iscrittiBus = min(rimanenti, posti)
        // quindi qui in pratica rimanenti sarà 0.
      }

      // Se bus è pieno:
      if (pieno) {
        // se abbiamo ancora rimanenti:
        if (rimanenti > 0) {
          // possiamo creare BUS SUCCESSIVO solo se:
          // - siamo già alla taglia massima disponibile (cioè non si può più fare upgrade)
          // - e le regole sono confermabili (altrimenti: waitlist)
          const siamoAllaTagliaMax = idxCorrente === maxIdx;

          if (siamoAllaTagliaMax && rules.confermabile) {
            // crea bus successivo
            numeroBus += 1;
            // continua il while e riparte dal più piccolo (catena[0]) per il bus successivo
            continue;
          }

          // altrimenti: non possiamo/ non dobbiamo creare bus successivo
          // rimanenti resta in waitlist -> usciamo dal ciclo
          break;
        }
      }

      // se non ci sono rimanenti, fine
      if (rimanenti <= 0) break;
    }

    const waitlist = Math.max(0, rimanenti);

    // waitlist ON/OFF:
    // ON se esiste gente non allocata (rimanenti > 0)
    // OFF se tutto allocato
    const waitlistAttiva = waitlist > 0;

    const note = waitlistAttiva
      ? 'Lista d’attesa ATTIVA: ci sono richieste in eccesso che non possono ancora essere trasformate in posti confermabili.'
      : 'Lista d’attesa DISATTIVA: tutte le richieste sono state allocate in posti disponibili.';

    return {
      righe,
      waitlist,
      waitlistAttiva,
      ricavoUnitarioLordo,
      costiUnitari,
      note,
    };
  }, [
    iscrittiTotali,
    bus,
    extra,
    margineMinimo,
    giorniLimiteAgenzia,
    simulaTempoOk,
    prezzoCliente,
  ]);

  return (
    <TripLayout id={String(id)} activeTab="numbers" riepilogo={riepilogo}>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="bg-slate-950/30 rounded-2xl border p-6 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Numeri & Meccanismo Bus</h2>
              <p className="text-sm text-slate-300/70">
                1) Si parte dal bus più piccolo disponibile • 2) Se serve capienza e regole OK → upgrade • 3) Se il più grande è pieno e regole OK → nasce il bus successivo • 4) Altrimenti waitlist ON.
              </p>
            </div>

            <button
              onClick={() => setSimulaTempoOk(v => !v)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                simulaTempoOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              Tempo Agenzia: {simulaTempoOk ? 'OK' : 'FUORI TEMPO'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-950/30 rounded-xl border p-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prezzo Cliente</div>
              <input
                type="number"
                value={prezzoCliente}
                onChange={e => setPrezzoCliente(Number(e.target.value) || 0)}
                className="mt-2 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
              />
              <div className="text-xs text-slate-300/70 mt-1">Incasso base per persona (es. 70€).</div>
            </div>

            <div className="bg-slate-950/30 rounded-xl border p-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margine minimo</div>
              <input
                type="number"
                value={margineMinimo}
                onChange={e => setMargineMinimo(Number(e.target.value) || 0)}
                className="mt-2 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
              />
              <div className="text-xs text-slate-300/70 mt-1">Per dichiarare “confermabile”.</div>
            </div>

            <div className="bg-slate-950/30 rounded-xl border p-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scadenza agenzia</div>
              <input
                type="number"
                value={giorniLimiteAgenzia}
                onChange={e => setGiorniLimiteAgenzia(Number(e.target.value) || 0)}
                className="mt-2 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
              />
              <div className="text-xs text-slate-300/70 mt-1">Es. 4 giorni prima.</div>
            </div>
          </div>
        </div>

        {/* EXTRA */}
        <div className="bg-slate-950/30 rounded-2xl border p-6 space-y-4">
          <h3 className="text-lg font-black text-white">Skipass / Assicurazione / Noleggio</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/30 rounded-xl border p-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skipass (costo)</div>
              <input
                type="number"
                value={extra.skipass.costo}
                onChange={e => setExtra(prev => ({ ...prev, skipass: { costo: Number(e.target.value) || 0 } }))}
                className="mt-2 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
              />
              <div className="text-xs text-slate-300/70 mt-1">È un costo unitario che impatta il margine.</div>
            </div>

            <div className="bg-slate-950/30 rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assicurazione</div>
                <button
                  onClick={() => setExtra(prev => ({ ...prev, assicurazione: { ...prev.assicurazione, attiva: !prev.assicurazione.attiva } }))}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    extra.assicurazione.attiva ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white/5 text-slate-300/70 border-white/10'
                  }`}
                >
                  {extra.assicurazione.attiva ? 'ATTIVA' : 'OFF'}
                </button>
              </div>
              <input
                type="number"
                value={extra.assicurazione.costo}
                onChange={e => setExtra(prev => ({ ...prev, assicurazione: { ...prev.assicurazione, costo: Number(e.target.value) || 0 } }))}
                className="w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
                disabled={!extra.assicurazione.attiva}
              />
              <div className="text-xs text-slate-300/70">Costo unitario (se attiva).</div>
            </div>

            <div className="bg-slate-950/30 rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Noleggio</div>
                <button
                  onClick={() => setExtra(prev => ({ ...prev, noleggio: { ...prev.noleggio, attivo: !prev.noleggio.attivo } }))}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    extra.noleggio.attivo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white/5 text-slate-300/70 border-white/10'
                  }`}
                >
                  {extra.noleggio.attivo ? 'ATTIVO' : 'OFF'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Costo</div>
                  <input
                    type="number"
                    value={extra.noleggio.costo}
                    onChange={e => setExtra(prev => ({ ...prev, noleggio: { ...prev.noleggio, costo: Number(e.target.value) || 0 } }))}
                    className="mt-1 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                    min={0}
                    disabled={!extra.noleggio.attivo}
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Prezzo</div>
                  <input
                    type="number"
                    value={extra.noleggio.prezzo}
                    onChange={e => setExtra(prev => ({ ...prev, noleggio: { ...prev.noleggio, prezzo: Number(e.target.value) || 0 } }))}
                    className="mt-1 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                    min={0}
                    disabled={!extra.noleggio.attivo}
                  />
                </div>
              </div>

              <div className="text-xs text-slate-300/70">
                Se prezzo &gt; costo, crei margine extra.
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-sm text-slate-200/80">
            <span className="font-black text-white">Unità:</span>{' '}
            ricavo lordo/persona <b>{formatEuro(calcolo.ricavoUnitarioLordo)}</b> •
            costi unitari/persona <b>{formatEuro(calcolo.costiUnitari)}</b>
          </div>
        </div>

        {/* BUS CONFIG */}
        <div className="bg-slate-950/30 rounded-2xl border p-6 space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">Bus disponibili</h3>
            <p className="text-sm text-slate-300/70">
              Il sistema prova a far entrare più persone facendo upgrade SOLO se le regole restano OK.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bus.map(b => (
              <div key={b.tipo} className="bg-slate-950/30 rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-white">{labelBus(b.tipo)}</div>
                  <button
                    onClick={() => toggleBus(b.tipo)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      b.attivo ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white/5 text-slate-300/70 border-white/10'
                    }`}
                  >
                    {b.attivo ? 'ATTIVO' : 'OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Posti</div>
                    <input
                      type="number"
                      value={b.posti}
                      onChange={e => updateBus(b.tipo, { posti: Number(e.target.value) || 0 })}
                      className="mt-1 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                      min={0}
                      disabled={!b.attivo}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Costo</div>
                    <input
                      type="number"
                      value={b.costo}
                      onChange={e => updateBus(b.tipo, { costo: Number(e.target.value) || 0 })}
                      className="mt-1 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                      min={0}
                      disabled={!b.attivo}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ISCRITTI */}
        <div className="bg-slate-950/30 rounded-2xl border p-6 space-y-3">
          <h3 className="text-lg font-black text-white">Simulazione iscritti</h3>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="number"
              value={iscrittiTotali}
              onChange={e => setIscrittiTotali(Number(e.target.value) || 0)}
              className="border rounded-xl px-4 py-2 font-black w-48"
              min={0}
            />
            <div className="text-sm text-slate-200/80">
              Inserisci quante persone vogliono prenotare. Il sistema decide upgrade / nuovo bus / waitlist.
            </div>
          </div>
        </div>

        {/* RISULTATI BUS */}
        <div className="space-y-4">
          <div className="text-sm text-slate-300/70">{calcolo.note}</div>

          {calcolo.righe.length === 0 ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 font-bold">
              Nessun calcolo disponibile.
            </div>
          ) : (
            calcolo.righe.map(r => (
              <div key={`${r.numeroBus}-${r.tipo}`} className="bg-slate-950/30 rounded-2xl border p-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="font-black text-white">
                    Bus {r.numeroBus} — {labelBus(r.tipo)} • {r.iscritti}/{r.posti}
                    {r.pieno ? <span className="ml-2 text-xs font-black text-indigo-600">PIENO</span> : null}
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      r.confermabile ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {r.confermabile ? 'CONFERMABILE' : 'NON CONFERMABILE'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-slate-950/30 border rounded-xl p-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo bus</div>
                    <div className="font-black text-white">{formatEuro(r.costoBus)}</div>
                  </div>

                  <div className="bg-slate-950/30 border rounded-xl p-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ricavi</div>
                    <div className="font-black text-white">{formatEuro(r.ricaviTotali)}</div>
                  </div>

                  <div className="bg-slate-950/30 border rounded-xl p-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costi totali</div>
                    <div className="font-black text-white">{formatEuro(r.costiTotali)}</div>
                  </div>

                  <div className="bg-slate-950/30 border rounded-xl p-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margine</div>
                    <div className={`font-black ${r.margine >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatEuro(r.margine)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${r.regolaTempoOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      Tempo: {r.regolaTempoOk ? 'OK' : 'NO'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${r.regolaMargineOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      Margine: {r.regolaMargineOk ? 'OK' : 'NO'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${r.regolaMin21Ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      Min 21 (solo Bus 1): {r.regolaMin21Ok ? 'OK' : 'NO'}
                    </span>
                  </div>

                  <div className={`mt-2 font-bold ${r.confermabile ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {r.noteDecisione}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* WAITLIST */}
        <div className={`rounded-2xl border p-6 ${calcolo.waitlistAttiva ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className={`font-black ${calcolo.waitlistAttiva ? 'text-amber-900' : 'text-emerald-900'}`}>
            Lista d’attesa: {calcolo.waitlistAttiva ? 'ATTIVA' : 'DISATTIVA'}
          </div>
          <div className={`text-sm mt-2 ${calcolo.waitlistAttiva ? 'text-amber-900/80' : 'text-emerald-900/80'}`}>
            {calcolo.waitlistAttiva ? (
              <>
                Persone in attesa: <b>{calcolo.waitlist}</b>.  
                La lista si spegne solo quando si può fare upgrade o creare un bus successivo mantenendo le regole.
              </>
            ) : (
              <>Nessuna persona in attesa: tutto allocato correttamente.</>
            )}
          </div>
        </div>
      </div>
    </TripLayout>
  );
}

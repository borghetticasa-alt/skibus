'use client';

import React, { useMemo, useState, use } from 'react';
import { TripLayout, TripStatus, SlaLevel } from '@/components/admin/TripLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  AlertTriangle,
  TrendingUp,
  Ticket,
  ShieldCheck,
  RotateCcw,
  Save,
  Bus,
  Users,
  CreditCard,
  Snowflake,
} from 'lucide-react';

/**
 * =========================
 * TIPI
 * =========================
 */
type CostsInput = {
  busCost: number;        // costo bus
  fixedCosts: number;     // costi fissi (staff, marketing, etc.)
  paymentFeePct: number;  // fee pagamento %
  riskPct: number;        // buffer rischio %
  seatPrice: number;      // prezzo posto
  seats: number;          // posti totali
};

type Scenario = { label: string; fillPct: number; };

type ScenarioRow = Scenario & {
  seatsSold: number;
  grossRevenue: number;
  netRevenue: number;
  profit: number;
};

type PresetId =
  | 'MIDIBUS_BASE'
  | 'COACH_BASE'
  | 'WINTER_PEAK'
  | 'PAYMENTS_STRIPE'
  | 'GROUP_21_PLUS_HINT'
  | 'RESET_DEFAULT';

/**
 * =========================
 * MOCK TRIP SUMMARY
 * =========================
 */
const TRIP_SUMMARY_MOCK = {
  destinationName: 'Monterosa – Gressoney',
  departureLabel: '14 Feb 2026 • Milano Lampugnano',
  status: 'SOFT_HOLD' as TripStatus,
  sla: {
    level: 'YELLOW' as SlaLevel,
    label: 'Rischio SLA',
    deadlineLabel: 'Check Agenzia',
  },
};

/**
 * =========================
 * SCENARI STANDARD
 * =========================
 */
const SCENARIOS: Scenario[] = [
  { label: '60%', fillPct: 0.6 },
  { label: '85%', fillPct: 0.85 },
  { label: '100%', fillPct: 1 },
];

const DEFAULT_INPUTS: CostsInput = {
  busCost: 1800,
  fixedCosts: 250,
  paymentFeePct: 3,
  riskPct: 5,
  seatPrice: 79,
  seats: 50,
};

/**
 * =========================
 * UTILS
 * =========================
 */
function money(n: number) {
  if (!Number.isFinite(n)) return '€ 0,00';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n);
}

function clampInt(v: number, min: number, max: number) {
  const x = Number.isFinite(v) ? Math.round(v) : min;
  return Math.min(max, Math.max(min, x));
}

/**
 * =========================
 * PAGE
 * =========================
 */
export default function NumbersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [inputs, setInputs] = useState<CostsInput>(DEFAULT_INPUTS);

  // Micro-stato UI per preset applicati (feedback)
  const [lastPreset, setLastPreset] = useState<PresetId | null>(null);

  const update =
    (key: keyof CostsInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(e.target.value);
      setInputs((prev) => {
        const next: CostsInput = { ...prev, [key]: Number.isFinite(raw) ? raw : 0 };

        // Guardrail “admin friendly”
        next.seats = clampInt(next.seats, 1, 80);
        next.paymentFeePct = Math.min(20, Math.max(0, next.paymentFeePct));
        next.riskPct = Math.min(50, Math.max(0, next.riskPct));
        next.seatPrice = Math.max(0, next.seatPrice);
        next.busCost = Math.max(0, next.busCost);
        next.fixedCosts = Math.max(0, next.fixedCosts);

        return next;
      });
      setLastPreset(null);
    };

  /**
   * =========================
   * PRESETS
   * =========================
   * Nota: sono “scorciatoie” UI, NON logica prezzi automatica.
   */
  const applyPreset = (preset: PresetId) => {
    setInputs((prev) => {
      let next: CostsInput = { ...prev };

      switch (preset) {
        case 'MIDIBUS_BASE':
          // Midibus tipico 20 posti
          next = {
            ...next,
            seats: 20,
            // costo bus: esempio (admin cambia a mano)
            busCost: Math.max(next.busCost, 450),
          };
          break;

        case 'COACH_BASE':
          // Coach tipico 52 posti
          next = {
            ...next,
            seats: 52,
            busCost: Math.max(next.busCost, 850),
          };
          break;

        case 'WINTER_PEAK':
          // In inverno aumentiamo rischio/buffer + un po’ di costi fissi
          next = {
            ...next,
            riskPct: Math.max(next.riskPct, 8),
            fixedCosts: Math.max(next.fixedCosts, 300),
          };
          break;

        case 'PAYMENTS_STRIPE':
          // Fee “tipica” (mettila come baseline)
          next = {
            ...next,
            paymentFeePct: Math.max(next.paymentFeePct, 3),
          };
          break;

        case 'GROUP_21_PLUS_HINT':
          // Questo NON cambia prezzi: evidenzia solo logica “da 21 persone”
          // qui teniamo solo un piccolo “hint” pratico: se seats < 21, suggeriamo di portarlo almeno a 21 (admin può ignorare)
          next = {
            ...next,
            seats: next.seats < 21 ? 21 : next.seats,
          };
          break;

        case 'RESET_DEFAULT':
        default:
          next = { ...DEFAULT_INPUTS };
          break;
      }

      // Guardrail post preset
      next.seats = clampInt(next.seats, 1, 80);
      next.paymentFeePct = Math.min(20, Math.max(0, next.paymentFeePct));
      next.riskPct = Math.min(50, Math.max(0, next.riskPct));
      next.seatPrice = Math.max(0, next.seatPrice);
      next.busCost = Math.max(0, next.busCost);
      next.fixedCosts = Math.max(0, next.fixedCosts);

      return next;
    });

    setLastPreset(preset);
  };

  /**
   * =========================
   * CALCOLI
   * =========================
   */
  const calc = useMemo(() => {
    const grossFull = inputs.seatPrice * inputs.seats;

    const paymentFees = grossFull * (inputs.paymentFeePct / 100);
    const riskBuffer = (inputs.busCost + inputs.fixedCosts) * (inputs.riskPct / 100);

    const totalCosts = inputs.busCost + inputs.fixedCosts + paymentFees + riskBuffer;

    const netPerSeat = inputs.seatPrice * (1 - inputs.paymentFeePct / 100);
    const breakEvenSeats = netPerSeat > 0 ? Math.ceil(totalCosts / netPerSeat) : 0;

    const breakEvenPct = inputs.seats > 0 ? Math.min(1, breakEvenSeats / inputs.seats) : 0;

    const isImpossible = breakEvenSeats > inputs.seats;
    const cushionSeats = Math.max(0, inputs.seats - breakEvenSeats);

    return {
      grossFull,
      paymentFees,
      riskBuffer,
      totalCosts,
      netPerSeat,
      breakEvenSeats,
      breakEvenPct,
      isImpossible,
      cushionSeats,
    };
  }, [inputs]);

  /**
   * =========================
   * SCENARI
   * =========================
   */
  const scenarios = useMemo<ScenarioRow[]>(() => {
    return SCENARIOS.map((s) => {
      const seatsSold = Math.floor(inputs.seats * s.fillPct);

      const grossRevenue = seatsSold * inputs.seatPrice;
      const netRevenue = grossRevenue * (1 - inputs.paymentFeePct / 100);

      const profit = netRevenue - calc.totalCosts;

      return { ...s, seatsSold, grossRevenue, netRevenue, profit };
    });
  }, [inputs, calc.totalCosts]);

  const bestScenario = useMemo(() => {
    return scenarios.reduce((best, cur) => (cur.profit > best.profit ? cur : best), scenarios[0]);
  }, [scenarios]);

  /**
   * =========================
   * UI STATUS
   * =========================
   */
  const bepColor =
    calc.isImpossible
      ? 'bg-rose-500'
      : calc.breakEvenSeats >= Math.ceil(inputs.seats * 0.85)
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const bepText =
    calc.isImpossible
      ? 'BEP irraggiungibile (anche pieno)'
      : calc.breakEvenSeats >= Math.ceil(inputs.seats * 0.85)
        ? 'BEP alto: serve riempimento forte'
        : 'BEP ok';

  const group21HintActive = inputs.seats >= 21;

  return (
    <TripLayout id={id} activeTab="numbers" tripSummary={TRIP_SUMMARY_MOCK}>
      <div className="space-y-8">

        {/* HERO / KPI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2 rounded-[32px] border border-slate-200">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Calculator size={14} /> Simulatore economia gita
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  Break-even & margine (admin)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Calcolo rapido: costi + fee + buffer rischio. Poi scenari riempimento.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => applyPreset('RESET_DEFAULT')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all active:scale-[0.98]"
                >
                  <RotateCcw size={14} /> Reset
                </button>

                <Button
                  onClick={() => console.log('[SIMULATION] Save', { id, inputs })}
                  className="rounded-2xl px-5 py-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Save size={14} className="mr-2" /> Salva
                </Button>
              </div>
            </div>

            {/* PRESET BAR */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-[28px] p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Preset rapidi
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Scorciatoie per impostare numeri “base”. Poi rifinisci a mano.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PresetButton
                    active={lastPreset === 'MIDIBUS_BASE'}
                    onClick={() => applyPreset('MIDIBUS_BASE')}
                    icon={<Bus size={14} />}
                    label="Midibus 20"
                  />
                  <PresetButton
                    active={lastPreset === 'COACH_BASE'}
                    onClick={() => applyPreset('COACH_BASE')}
                    icon={<Bus size={14} />}
                    label="Coach 52"
                  />
                  <PresetButton
                    active={lastPreset === 'WINTER_PEAK'}
                    onClick={() => applyPreset('WINTER_PEAK')}
                    icon={<Snowflake size={14} />}
                    label="Inverno peak"
                  />
                  <PresetButton
                    active={lastPreset === 'PAYMENTS_STRIPE'}
                    onClick={() => applyPreset('PAYMENTS_STRIPE')}
                    icon={<CreditCard size={14} />}
                    label="Fee pagamento"
                  />
                  <PresetButton
                    active={lastPreset === 'GROUP_21_PLUS_HINT'}
                    onClick={() => applyPreset('GROUP_21_PLUS_HINT')}
                    icon={<Users size={14} />}
                    label="Gruppo 21+"
                  />
                </div>
              </div>

              {/* Hint 21+ */}
              <div className="mt-4 flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200">
                <Users size={18} className={group21HintActive ? 'text-emerald-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Logica gruppi 21+
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Qui non calcoliamo prezzi automatici: però quando la gita è “da gruppo” (21+),
                    è utile ragionare sul target minimo. Ora: <b>{group21HintActive ? 'OK (21+)' : 'Sotto soglia (21+)'}</b>.
                  </p>
                </div>
              </div>
            </div>

            {/* BEP BAR */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${bepColor} ${!calc.isImpossible ? 'animate-pulse' : ''}`} />
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      Posti minimi (BEP): <span className="text-indigo-600">{calc.breakEvenSeats}</span> / {inputs.seats}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {bepText}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cuscinetto</div>
                  <div className={`text-sm font-black ${calc.cushionSeats === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {calc.cushionSeats} posti
                  </div>
                </div>
              </div>

              <div className="mt-4 h-3 bg-white rounded-full border border-slate-200 overflow-hidden">
                <div
                  className={`h-full ${bepColor} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.round(calc.breakEvenPct * 100)}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>0</span>
                <span>{Math.round(calc.breakEvenPct * 100)}% verso BEP</span>
                <span>{inputs.seats}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-[32px] border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <ShieldCheck size={14} /> KPI
              </div>
              {calc.isImpossible && (
                <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-[9px] font-black uppercase tracking-widest border border-rose-100">
                  rischio
                </span>
              )}
            </div>

            <div className="mt-5 space-y-5">
              <Kpi
                icon={<Ticket size={18} />}
                label="Netto per posto"
                value={money(calc.netPerSeat)}
                hint={`Fee pagamento: ${inputs.paymentFeePct}%`}
              />
              <Kpi
                icon={<TrendingUp size={18} />}
                label="Costi totali stimati"
                value={money(calc.totalCosts)}
                hint={`Bus + fissi + fee + rischio`}
              />
              <Kpi
                icon={<AlertTriangle size={18} />}
                label="Miglior scenario"
                value={`${bestScenario.label}: ${money(bestScenario.profit)}`}
                hint={bestScenario.profit >= 0 ? 'Margine positivo' : 'Margine negativo'}
                accent={bestScenario.profit >= 0 ? 'emerald' : 'rose'}
              />
            </div>
          </Card>
        </div>

        {/* INPUTS */}
        <Card className="p-6 rounded-[32px] border border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Costi & Prezzi</h3>
            <p className="text-xs text-slate-500 mt-1">
              Valori modificabili. I preset sono solo scorciatoie.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input label="Costo Bus (€)" value={inputs.busCost} onChange={update('busCost')} />
            <Input label="Costi Fissi (€)" value={inputs.fixedCosts} onChange={update('fixedCosts')} />
            <Input label="Prezzo posto (€)" value={inputs.seatPrice} onChange={update('seatPrice')} />
            <Input label="Posti totali" value={inputs.seats} onChange={update('seats')} />
            <Input label="Commissioni % pagamento" value={inputs.paymentFeePct} onChange={update('paymentFeePct')} />
            <Input label="Rischio %" value={inputs.riskPct} onChange={update('riskPct')} />
          </div>

          {(inputs.seatPrice === 0 || inputs.seats === 0) && (
            <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Attenzione input
                </div>
                <p className="text-xs text-amber-900/70 mt-1">
                  Prezzo posto o posti totali a 0: risultati non significativi.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* SCENARI */}
        <Card className="p-6 rounded-[32px] border border-slate-200">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Scenari di riempimento</h3>
          <p className="text-xs text-slate-500 mt-1">
            Profitto = ricavo netto (dopo fee) − costi totali stimati.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="grid grid-cols-12 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="col-span-3 px-4 py-3">Scenario</div>
              <div className="col-span-3 px-4 py-3">Posti venduti</div>
              <div className="col-span-3 px-4 py-3">Net revenue</div>
              <div className="col-span-3 px-4 py-3 text-right">Profitto</div>
            </div>

            {scenarios.map((s) => {
              const profitOk = s.profit >= 0;
              return (
                <div
                  key={s.label}
                  className="grid grid-cols-12 items-center border-t border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="col-span-3 px-4 py-4">
                    <span className="text-sm font-black text-slate-900">{s.label}</span>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      {Math.round(s.fillPct * 100)}% capacity
                    </div>
                  </div>

                  <div className="col-span-3 px-4 py-4">
                    <span className="text-sm font-black text-slate-900">
                      {s.seatsSold} / {inputs.seats}
                    </span>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                      <div
                        className={`h-full ${s.seatsSold >= calc.breakEvenSeats ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all duration-700`}
                        style={{ width: `${Math.min(100, Math.round((s.seatsSold / inputs.seats) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="col-span-3 px-4 py-4">
                    <span className="text-sm font-black text-slate-900">{money(s.netRevenue)}</span>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Lordo: {money(s.grossRevenue)}
                    </div>
                  </div>

                  <div className="col-span-3 px-4 py-4 text-right">
                    <span className={`text-sm font-black ${profitOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {profitOk ? '+' : ''}
                      {money(s.profit)}
                    </span>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      {s.seatsSold >= calc.breakEvenSeats ? 'sopra BEP' : 'sotto BEP'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </TripLayout>
  );
}

/**
 * =========================
 * UI COMPONENTS
 * =========================
 */
function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={onChange}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
      />
    </div>
  );
}

function PresetButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-[0.98]',
        active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
      ].join(' ')}
    >
      {icon} {label}
    </button>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  accent = 'indigo',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: 'indigo' | 'emerald' | 'rose';
}) {
  const accentStyles =
    accent === 'emerald'
      ? 'bg-emerald-50 text-emerald-600'
      : accent === 'rose'
        ? 'bg-rose-50 text-rose-600'
        : 'bg-indigo-50 text-indigo-600';

  return (
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-2xl ${accentStyles}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </div>
        <div className="text-lg font-black text-slate-900 tracking-tight mt-1">
          {value}
        </div>
        {hint && (
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useMemo, useState, use } from 'react';
import { TripLayout, TripStatus, SlaLevel } from '@/components/admin/TripLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, ShieldAlert } from 'lucide-react';

/**
 * =========================
 * TIPI
 * =========================
 */
type CostsInput = {
  busCost: number;
  fixedCosts: number;
  paymentFeePct: number;
  riskPct: number;
  seatPrice: number;
  seats: number;
};

type Scenario = {
  label: string;
  fillPct: number;
};

/**
 * =========================
 * MOCK TripSummary (obbligatorio per TripLayout)
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
 * SCENARI
 * =========================
 */
const SCENARIOS: Scenario[] = [
  { label: '60%', fillPct: 0.6 },
  { label: '85%', fillPct: 0.85 },
  { label: '100%', fillPct: 1 },
];

/**
 * =========================
 * PAGINA
 * =========================
 * Next 16: params può essere Promise -> unwrap con use()
 */
export default function NumbersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [inputs, setInputs] = useState<CostsInput>({
    busCost: 1800,
    fixedCosts: 250,
    paymentFeePct: 3,
    riskPct: 5,
    seatPrice: 79,
    seats: 50,
  });

  const update =
    (key: keyof CostsInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      setInputs((prev) => ({ ...prev, [key]: Number.isFinite(next) ? next : 0 }));
    };

  /**
   * =========================
   * CALCOLI
   * =========================
   */
  const calculations = useMemo(() => {
    const grossRevenueFull = inputs.seatPrice * inputs.seats;

    const paymentFees = grossRevenueFull * (inputs.paymentFeePct / 100);
    const riskBuffer = (inputs.busCost + inputs.fixedCosts) * (inputs.riskPct / 100);

    const totalCosts = inputs.busCost + inputs.fixedCosts + paymentFees + riskBuffer;

    const netPerSeat = inputs.seatPrice * (1 - inputs.paymentFeePct / 100);
    const breakEvenSeats = netPerSeat > 0 ? Math.ceil(totalCosts / netPerSeat) : 0;

    const isHealthy = breakEvenSeats > 0 && breakEvenSeats <= inputs.seats;

    return {
      grossRevenueFull,
      paymentFees,
      riskBuffer,
      totalCosts,
      netPerSeat,
      breakEvenSeats,
      isHealthy,
    };
  }, [inputs]);

  const scenarios = useMemo(() => {
    return SCENARIOS.map((s) => {
      const seatsSold = Math.floor(inputs.seats * s.fillPct);
      const revenue = seatsSold * inputs.seatPrice;
      const netRevenue = revenue * (1 - inputs.paymentFeePct / 100);

      const profit = netRevenue - calculations.totalCosts;

      return {
        ...s,
        seatsSold,
        revenue,
        profit,
      };
    });
  }, [inputs, calculations.totalCosts]);

  return (
    <TripLayout id={id} activeTab="numbers" tripSummary={TRIP_SUMMARY_MOCK}>
      <div className="space-y-8">
        {/* ================= HEADER KPI ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            icon={<Calculator size={20} />}
            label="Costi totali stimati"
            value={`€ ${calculations.totalCosts.toFixed(2)}`}
            tone="warn"
          />
          <KpiCard
            icon={<TrendingUp size={20} />}
            label="Ricavo netto per posto"
            value={`€ ${calculations.netPerSeat.toFixed(2)}`}
            tone="primary"
          />
          <KpiCard
            icon={<ShieldAlert size={20} />}
            label="Break-even (posti)"
            value={calculations.breakEvenSeats || '—'}
            tone={calculations.isHealthy ? 'good' : 'bad'}
          />
        </div>

        {/* ================= INPUT ================= */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Costi & Prezzi</h2>
            <p className="text-xs text-slate-500 mt-1">
              Simulazione rapida: bus + fissi + commissioni pagamento + buffer rischio.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input label="Costo Bus (€)" value={inputs.busCost} onChange={update('busCost')} />
            <Input label="Costi Fissi (€)" value={inputs.fixedCosts} onChange={update('fixedCosts')} />
            <Input label="Prezzo posto (€)" value={inputs.seatPrice} onChange={update('seatPrice')} />
            <Input label="Posti totali" value={inputs.seats} onChange={update('seats')} />
            <Input
              label="Commissioni % pagamento"
              value={inputs.paymentFeePct}
              onChange={update('paymentFeePct')}
            />
            <Input label="Rischio %" value={inputs.riskPct} onChange={update('riskPct')} />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-xs text-slate-500">
              {calculations.isHealthy ? (
                <span className="text-emerald-700 font-semibold">
                  OK: break-even entro la capienza (≤ {inputs.seats}).
                </span>
              ) : (
                <span className="text-rose-700 font-semibold">
                  Attenzione: break-even oltre la capienza o dati non validi.
                </span>
              )}
            </div>

            {/* Niente variant="outline" per evitare errori di typing */}
            <Button onClick={() => console.log('[SIMULATION] Save', { id, inputs })}>
              Salva simulazione
            </Button>
          </div>
        </Card>

        {/* ================= SCENARI ================= */}
        <Card className="p-6 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Scenari di riempimento</h2>
              <p className="text-xs text-slate-500 mt-1">
                Margine stimato ai diversi livelli di riempimento.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              (netto commissioni)
            </span>
          </div>

          <div className="space-y-2">
            {scenarios.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between border-b border-slate-100 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                    {s.label}
                  </span>
                  <span className="text-slate-700">{s.seatsSold} posti</span>
                </div>

                <span className={s.profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                  {s.profit >= 0 ? '+' : ''}€ {s.profit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </TripLayout>
  );
}

/**
 * =========================
 * UI COMPONENTS LOCALI
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
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-600">{label}</label>
      <input
        type="number"
        value={value}
        onChange={onChange}
        className="rounded border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: 'default' | 'primary' | 'good' | 'warn' | 'bad';
}) {
  const toneBox =
    tone === 'primary'
      ? 'bg-indigo-50 text-indigo-600'
      : tone === 'good'
      ? 'bg-emerald-50 text-emerald-600'
      : tone === 'warn'
      ? 'bg-amber-50 text-amber-600'
      : tone === 'bad'
      ? 'bg-rose-50 text-rose-600'
      : 'bg-slate-50 text-slate-400';

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${toneBox}`}>{icon}</div>
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          {label}
        </div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}

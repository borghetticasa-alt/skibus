'use client';

import React, { useMemo, useState, use } from 'react';
import { TripLayout, TripStatus, SlaLevel } from '@/components/admin/TripLayout';

// UI bricks (tuoi)
import { Section } from '@/components/ui/section';
import { Kpi } from '@/components/ui/kpi';
import { Pill } from '@/components/ui/pill';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CostsInput = {
  busCost: number;
  fixedCosts: number;
  paymentFeePct: number;
  riskPct: number;
  seatPrice: number;
  seats: number;
};

type Scenario = { label: string; fillPct: number };

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

const SCENARIOS: Scenario[] = [
  { label: '60%', fillPct: 0.6 },
  { label: '85%', fillPct: 0.85 },
  { label: '100%', fillPct: 1 },
];

function eur(n: number) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}€ ${abs.toFixed(2)}`;
}

export default function NumbersPage({ params }: { params: Promise<{ id: string }> }) {
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
    (key: keyof CostsInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      setInputs((prev) => ({ ...prev, [key]: Number.isFinite(next) ? next : 0 }));
    };

  const calculations = useMemo(() => {
    const grossRevenueFull = inputs.seatPrice * inputs.seats;

    const paymentFees = grossRevenueFull * (inputs.paymentFeePct / 100);
    const riskBuffer = (inputs.busCost + inputs.fixedCosts) * (inputs.riskPct / 100);

    const totalCosts = inputs.busCost + inputs.fixedCosts + paymentFees + riskBuffer;

    const netPerSeat = inputs.seatPrice * (1 - inputs.paymentFeePct / 100);
    const breakEvenSeats = netPerSeat > 0 ? Math.ceil(totalCosts / netPerSeat) : 0;

    const breakEvenFillPct = inputs.seats > 0 ? breakEvenSeats / inputs.seats : 0;

    return {
      grossRevenueFull,
      paymentFees,
      riskBuffer,
      totalCosts,
      netPerSeat,
      breakEvenSeats,
      breakEvenFillPct,
    };
  }, [inputs]);

  const scenarios = useMemo(() => {
    return SCENARIOS.map((s) => {
      const seatsSold = Math.floor(inputs.seats * s.fillPct);
      const revenue = seatsSold * inputs.seatPrice;
      const netRevenue = revenue * (1 - inputs.paymentFeePct / 100);
      const profit = netRevenue - calculations.totalCosts;

      return { ...s, seatsSold, revenue, netRevenue, profit };
    });
  }, [inputs, calculations.totalCosts]);

  const isSafe = calculations.breakEvenSeats <= inputs.seats && calculations.breakEvenSeats > 0;

  return (
    <TripLayout id={id} activeTab="numbers" tripSummary={TRIP_SUMMARY_MOCK}>
      <Section
        title="Economia"
        subtitle="Simulazione rapida: costi, commissioni, buffer rischio e break-even."
        right={
          <div className="flex items-center gap-2">
            <Pill tone={isSafe ? 'success' : 'warning'}>
              {isSafe ? 'Break-even raggiungibile' : 'Attenzione: BEP alto'}
            </Pill>
            {/* NON usiamo variant outline (ti rompe build se non esiste) */}
            <Button onClick={() => console.log('[SIMULATION] Save', { id, inputs })}>
              Salva simulazione
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* INPUTS */}
          <Card className="p-6 rounded-[28px] border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Costi & Prezzi</h2>
                <p className="text-xs font-medium text-slate-500">
                  Inserisci valori reali. 0 = escluso dai calcoli quando sensato.
                </p>
              </div>
              <Pill tone="neutral">Preset: Manuale</Pill>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input label="Costo Bus (€)" value={inputs.busCost} onChange={update('busCost')} />
              <Input label="Costi fissi (€)" value={inputs.fixedCosts} onChange={update('fixedCosts')} />
              <Input label="Prezzo posto (€)" value={inputs.seatPrice} onChange={update('seatPrice')} />
              <Input label="Posti totali" value={inputs.seats} onChange={update('seats')} />
              <Input label="Commissioni % pagamento" value={inputs.paymentFeePct} onChange={update('paymentFeePct')} />
              <Input label="Rischio %" value={inputs.riskPct} onChange={update('riskPct')} />
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              <Pill tone="neutral">Bus + Fissi + Fee + Rischio</Pill>
              <Pill tone="neutral">Netto/posto = prezzo - fee</Pill>
              <Pill tone={isSafe ? 'success' : 'warning'}>
                BEP: {calculations.breakEvenSeats} / {inputs.seats} posti
              </Pill>
            </div>
          </Card>

          {/* KPIs */}
          <div className="space-y-6">
            <Card className="p-6 rounded-[28px] border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 gap-4">
                <Kpi label="Costi totali stimati" value={eur(calculations.totalCosts)} />
                <Kpi label="Netto per posto" value={eur(calculations.netPerSeat)} />
                <Kpi
                  label="Posti minimi (Break-even)"
                  value={`${calculations.breakEvenSeats}`}
                  emphasis
                />
              </div>
            </Card>

            <Card className="p-6 rounded-[28px] border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-3">Scenari riempimento</h3>
              <div className="space-y-2">
                {scenarios.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between border-b border-slate-100 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Pill tone="neutral">{s.label}</Pill>
                      <span className="text-slate-700 font-semibold">{s.seatsSold} posti</span>
                    </div>
                    <span
                      className={
                        s.profit >= 0
                          ? 'text-emerald-600 font-black'
                          : 'text-rose-600 font-black'
                      }
                    >
                      {s.profit >= 0 ? '+' : '-'}
                      {eur(Math.abs(s.profit))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 text-[11px] font-bold text-slate-400">
                Break-even ≈ {(calculations.breakEvenFillPct * 100).toFixed(0)}% riempimento
              </div>
            </Card>
          </div>
        </div>
      </Section>
    </TripLayout>
  );
}

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
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={onChange}
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-50"
      />
    </div>
  );
}

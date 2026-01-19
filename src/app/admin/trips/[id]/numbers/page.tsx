'use client';

import React, { useMemo, useState, use } from 'react';

import { TripLayout, TripStatus, SlaLevel } from '@/components/admin/TripLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
 * MOCK DATI GITA
 * =========================
 * (in futuro arrivano da DB)
 * ✅ Deve rispettare TripSummary richiesto da TripLayout
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

/**
 * =========================
 * PAGINA
 * =========================
 * ✅ Next 16: params può essere Promise -> unwrap con React.use()
 */
export default function NumbersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  /**
   * =========================
   * STATE INPUT
   * =========================
   */
  const [inputs, setInputs] = useState<CostsInput>({
    busCost: 1800,
    fixedCosts: 250,
    paymentFeePct: 3,
    riskPct: 5,
    seatPrice: 79,
    seats: 50,
  });

  /**
   * =========================
   * HANDLER
   * =========================
   */
  const update =
    (key: keyof CostsInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      setInputs((prev) => ({ ...prev, [key]: Number.isFinite(next) ? next : 0 }));
    };

  /**
   * =========================
   * CALCOLI PRINCIPALI
   * =========================
   */
  const calculations = useMemo(() => {
    const grossRevenueFull = inputs.seatPrice * inputs.seats;

    const paymentFees = grossRevenueFull * (inputs.paymentFeePct / 100);
    const riskBuffer = (inputs.busCost + inputs.fixedCosts) * (inputs.riskPct / 100);

    const totalCosts = inputs.busCost + inputs.fixedCosts + paymentFees + riskBuffer;

    const netPerSeat = inputs.seatPrice * (1 - inputs.paymentFeePct / 100);

    const breakEvenSeats = netPerSeat > 0 ? Math.ceil(totalCosts / netPerSeat) : 0;

    return {
      grossRevenueFull,
      paymentFees,
      riskBuffer,
      totalCosts,
      netPerSeat,
      breakEvenSeats,
    };
  }, [inputs]);

  /**
   * =========================
   * SCENARI
   * =========================
   */
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

  /**
   * =========================
   * RENDER
   * =========================
   */
  return (
    <TripLayout id={id} activeTab="numbers" tripSummary={TRIP_SUMMARY_MOCK}>
      <div className="space-y-8">
        {/* ================= INPUT ================= */}
        <Card className="p-6 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Costi & Prezzi</h2>
              <p className="text-xs text-slate-500">
                Simulazione veloce: costi, commissioni e buffer rischio.
              </p>
            </div>
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
        </Card>

        {/* ================= OUTPUT ================= */}
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Riepilogo economico</h2>

          <Row label="Costi totali stimati" value={`€ ${calculations.totalCosts.toFixed(2)}`} />
          <Row label="Ricavo netto per posto" value={`€ ${calculations.netPerSeat.toFixed(2)}`} />
          <Row label="Posti minimi (Break Even)" value={calculations.breakEvenSeats} highlight />
        </Card>

        {/* ================= SCENARI ================= */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Scenari di riempimento</h2>

          <div className="space-y-2">
            {scenarios.map((s) => (
              <div key={s.label} className="flex justify-between border-b py-2 text-sm">
                <span className="text-slate-700">
                  {s.label} – {s.seatsSold} posti
                </span>
                <span
                  className={
                    s.profit >= 0
                      ? 'text-emerald-600 font-semibold'
                      : 'text-rose-600 font-semibold'
                  }
                >
                  {s.profit >= 0 ? '+' : ''}
                  € {s.profit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* ================= AZIONI ================= */}
        <div className="flex justify-end">
          <Button
            onClick={() => console.log('[SIMULATION] Save', { id, inputs })}
            className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
          >
            Salva simulazione
          </Button>
        </div>
      </div>
    </TripLayout>
  );
}

/**
 * =========================
 * COMPONENTI INTERNI
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
        className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={highlight ? 'font-semibold text-indigo-600' : 'text-slate-900'}>
        {value}
      </span>
    </div>
  );
}

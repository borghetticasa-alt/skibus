
"use client";

import React, { use, useMemo, useState } from "react";
import {
  AlertCircle,
  Bus,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Info,
  PlusCircle,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  TripLayout,
  TripStatus,
  SlaLevel,
} from "../../../../../components/admin/TripLayout";

/** DTO Interfaces */
interface BusStatusDTO {
  id: string;
  type: "COACH" | "MIDIBUS";
  status: TripStatus;
  capacity: number;
  sold: number;
  bep: number;
  margin: number;
}

interface TripOverviewDTO {
  summary: {
    destinationName: string;
    departureLabel: string;
    status: TripStatus;
    sla: { level: SlaLevel; label: string; deadlineLabel?: string };
  };
  kpis: {
    totalSold: number;
    waitlistCount: number;
    paidRevenue: number;
    estMargin: number;
    waitlistToPaidRate: number;
  };
  alerts: Array<{
    id: string;
    code: string;
    severity: "info" | "warning" | "critical";
    message: string;
  }>;
  buses: BusStatusDTO[];
  recommendations: Array<{
    id: string;
    type: "OPEN_MIDIBUS" | "UPGRADE_COACH" | "CONFIRM_VEHICLE";
    title: string;
    description: string;
    impact: string;
  }>;
}

/** Mock */
const MOCK_DATA: TripOverviewDTO = {
  summary: {
    destinationName: "Gressoney-La-Trinité",
    departureLabel: "18 Gen 2026 • Milano Lampugnano",
    status: "SOFT_HOLD",
    sla: {
      level: "YELLOW",
      label: "Rischio SLA",
      deadlineLabel: "Scade tra 14h 20m",
    },
  },
  kpis: {
    totalSold: 42,
    waitlistCount: 14,
    paidRevenue: 1890,
    estMargin: 420,
    waitlistToPaidRate: 12.5,
  },
  alerts: [
    {
      id: "1",
      code: "SLA_RISK",
      severity: "critical",
      message: "Mancano 3 posti per il Break-even del Bus #1",
    },
    {
      id: "2",
      code: "WL_DEMAND",
      severity: "warning",
      message: "Domanda in waitlist sufficiente per Midibus 20 posti",
    },
    {
      id: "3",
      code: "PROMO_ACTIVE",
      severity: "info",
      message: 'Campagna promozionale "Early Snow" attiva',
    },
  ],
  buses: [
    {
      id: "BUS-01",
      type: "COACH",
      status: "SOFT_HOLD",
      capacity: 52,
      sold: 42,
      bep: 45,
      margin: -120,
    },
  ],
  recommendations: [
    {
      id: "rec-1",
      type: "OPEN_MIDIBUS",
      title: "Attiva secondo mezzo (Midibus)",
      description:
        "La waitlist ha raggiunto 14 persone. Aprendo un Midibus ora catturiamo la domanda del weekend.",
      impact: "+€310 margine stimato",
    },
    {
      id: "rec-2",
      type: "UPGRADE_COACH",
      title: "Upgrade a Coach 52 posti",
      description:
        "Trasforma il Midibus attuale in un Coach per ottimizzare il costo per passeggero.",
      impact: "+12% efficienza costi",
    },
    {
      id: "rec-3",
      type: "CONFIRM_VEHICLE",
      title: "Conferma definitiva flotta",
      description:
        "Blocca i prezzi attuali del fornitore confermando i mezzi assegnati.",
      impact: "Zero penali",
    },
  ],
};

const statusPillStyles: Record<TripStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  SOFT_HOLD: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LOCKED: "bg-violet-50 text-violet-700 ring-violet-200",
  FULL: "bg-rose-50 text-rose-700 ring-rose-200",
  CANCELLED: "bg-slate-900 text-slate-100 ring-slate-900",
};

function moneyEUR(n: number) {
  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `€${n}`;
  }
}

function KpiCard({
  label,
  value,
  icon,
  subValue,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subValue?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneMap: Record<typeof tone, string> = {
    neutral: "text-slate-500",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
            {icon}
          </span>
          {label}
        </div>
      </div>

      <div className="text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
      {subValue ? (
        <div className={`mt-1 text-xs font-semibold ${toneMap[tone]}`}>
          {subValue}
        </div>
      ) : null}
    </div>
  );
}

function AlertCard({
  code,
  severity,
  message,
}: {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
}) {
  const style =
    severity === "critical"
      ? "bg-rose-50 border-rose-200 text-rose-900"
      : severity === "warning"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-slate-50 border-slate-200 text-slate-800";

  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          <AlertCircle size={18} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-60">
            {code}
          </div>
          <div className="text-sm font-semibold leading-snug">{message}</div>
        </div>
      </div>
    </div>
  );
}

export default function TripOverviewPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Next 16: params può essere una Promise -> unwrap con React.use()
  const { id } = use(params as any);

  const [data] = useState<TripOverviewDTO>(MOCK_DATA);
  const [selectedAction, setSelectedAction] = useState<
    TripOverviewDTO["recommendations"][0] | null
  >(null);
  const [note, setNote] = useState("");

  const occupancy = useMemo(() => {
    const totalCap = data.buses.reduce((acc, b) => acc + b.capacity, 0);
    const totalSold = data.buses.reduce((acc, b) => acc + b.sold, 0);
    if (!totalCap) return 0;
    return Math.round((totalSold / totalCap) * 100);
  }, [data.buses]);

  const displayedRecommendations = data.recommendations.slice(0, 2);
  const hiddenCount = Math.max(0, data.recommendations.length - 2);

  const handleConfirmAction = () => {
    console.log(`Esecuzione azione ${selectedAction?.id} con nota: ${note}`);
    setSelectedAction(null);
    setNote("");
  };

  const noteTooShort = note.trim().length > 0 && note.trim().length < 10;

  return (
    <TripLayout id={id} activeTab="overview" tripSummary={data.summary}>
      <div className="space-y-8">
        {/* Top summary strip */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-500">Viaggio</div>
              <div className="text-xl font-bold tracking-tight text-slate-900">
                {data.summary.destinationName}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} /> {data.summary.departureLabel}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bus size={14} /> Occupazione {occupancy}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                  statusPillStyles[data.summary.status]
                }`}
              >
                {data.summary.status.replace("_", " ")}
              </span>

              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {data.summary.sla.label}
                {data.summary.sla.deadlineLabel ? (
                  <span className="ml-2 text-slate-500">
                    {data.summary.sla.deadlineLabel}
                  </span>
                ) : null}
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`/admin/trips/${id}/numbers`}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Numeri
            </a>
            <a
              href={`/admin/trips/${id}/buses`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Mezzi
            </a>
            <a
              href={`/admin/trips/${id}/waitlist`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Waitlist
            </a>
            <a
              href="/checkout"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Apri checkout
            </a>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Posti venduti"
            value={data.kpis.totalSold}
            icon={<Users size={16} />}
            subValue={`${data.kpis.waitlistToPaidRate}% conversione waitlist`}
            tone="neutral"
          />
          <KpiCard
            label="Waitlist"
            value={data.kpis.waitlistCount}
            icon={<TrendingUp size={16} />}
            subValue="Richieste attive"
            tone="warning"
          />
          <KpiCard
            label="Ricavo netto"
            value={moneyEUR(data.kpis.paidRevenue)}
            icon={<Wallet size={16} />}
            subValue="Pagamenti confermati"
            tone="success"
          />
          <KpiCard
            label="Margine stimato"
            value={moneyEUR(data.kpis.estMargin)}
            icon={<PlusCircle size={16} />}
            subValue={data.kpis.estMargin >= 0 ? "In positivo" : "In negativo"}
            tone={data.kpis.estMargin >= 0 ? "success" : "danger"}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left */}
          <div className="space-y-8 lg:col-span-2">
            {/* Recommendations */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">
                  Azioni consigliate
                </h2>
                <div className="text-xs font-semibold text-slate-500">
                  {hiddenCount > 0 ? `+${hiddenCount} altre` : "—"}
                </div>
              </div>

              <div className="grid gap-3">
                {displayedRecommendations.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => {
                      setSelectedAction(rec);
                      setNote("");
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-700 ring-1 ring-indigo-200">
                          Suggerita
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {rec.impact}
                        </span>
                      </div>
                      <div className="text-base font-semibold text-slate-900">
                        {rec.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {rec.description}
                      </div>
                    </div>

                    <div className="ml-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 transition group-hover:translate-x-0.5">
                      <ChevronRight className="text-slate-400 group-hover:text-indigo-600" />
                    </div>
                  </button>
                ))}

                {hiddenCount > 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-3 text-center text-xs font-semibold text-slate-500">
                    Altre {hiddenCount} opzioni disponibili nelle tab dedicate
                    (Mezzi / Numeri / Waitlist)
                  </div>
                ) : null}
              </div>
            </section>

            {/* Fleet table */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Stato mezzi assegnati
              </h2>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500">
                        Bus
                      </th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500">
                        Stato
                      </th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500">
                        Occupazione
                      </th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-500">
                        B.E.P.
                      </th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500">
                        Margine
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {data.buses.map((bus) => {
                      const occ = Math.round((bus.sold / bus.capacity) * 100);
                      return (
                        <tr key={bus.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              {bus.id}
                            </div>
                            <div className="text-xs font-semibold text-slate-500">
                              {bus.type}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${
                                statusPillStyles[bus.status]
                              }`}
                            >
                              {bus.status.replace("_", " ")}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-indigo-500"
                                  style={{ width: `${occ}%` }}
                                />
                              </div>
                              <div className="text-sm font-semibold text-slate-700">
                                {bus.sold}/{bus.capacity} ({occ}%)
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                            {bus.bep} pax
                          </td>

                          <td className="px-6 py-4 text-right text-sm font-bold">
                            <span
                              className={
                                bus.margin >= 0
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }
                            >
                              {bus.margin >= 0 ? "+" : ""}
                              {moneyEUR(bus.margin)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Alert attivi
              </h2>

              <div className="space-y-3">
                {data.alerts.map((a) => (
                  <AlertCard
                    key={a.id}
                    code={a.code}
                    severity={a.severity}
                    message={a.message}
                  />
                ))}
              </div>
            </section>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                <Info size={14} /> Note operative
              </div>
              <p className="text-sm leading-relaxed text-slate-200">
                “Confermare eventuale upgrade coach entro giovedì per evitare
                penali del fornitore.”
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedAction.title}
                  </div>
                  <div className="text-sm text-slate-600">
                    {selectedAction.description}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAction(null)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Chiudi
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Impatto</span>
                <span className="font-bold text-emerald-700">
                  {selectedAction.impact}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">
                  Target operativo
                </span>
                <span className="font-bold text-slate-900">~65% waitlist</span>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">
                Nota (min. 10 caratteri)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`w-full rounded-xl border p-3 text-sm outline-none focus:ring-2 ${
                  noteTooShort
                    ? "border-amber-300 focus:ring-amber-200"
                    : "border-slate-200 focus:ring-indigo-200"
                }`}
                placeholder="Giustifica l'azione per audit..."
              />
              {noteTooShort ? (
                <div className="mt-2 text-xs font-semibold text-amber-700">
                  La nota deve essere più dettagliata per l’audit.
                </div>
              ) : null}
            </label>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setSelectedAction(null)}
                className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                disabled={note.trim().length < 10}
                onClick={handleConfirmAction}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-200"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </TripLayout>
  );
}

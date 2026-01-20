"use client";

import React, { use, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList, // ✅ aggiunto
  Euro,
  Info,
  MapPin,
  ShieldAlert,
  Users,
} from "lucide-react";

import { TripLayout, TripStatus, SlaLevel } from "@/components/admin/TripLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * OVERVIEW (Admin)
 * - Dashboard riassuntiva della gita
 * - KPI immediati + CTA operative
 * - Mock locale (in futuro da DB)
 */

type VehicleType = "MIDIBUS" | "COACH";
type VehicleState = "NOT_SET" | "SOFT_HOLD" | "CONFIRMED";

type TripOverviewDTO = {
  summary: {
    destinationName: string;
    departureLabel: string;
    departureAtISO: string; // ISO datetime
    status: TripStatus;
    sla: { level: SlaLevel; label: string; deadlineLabel?: string };
  };
  rules: {
    groupThreshold: number; // 21
    notifyAgencyHoursBefore: number; // es 48
  };
  kpis: {
    waitlistInQueuePeople: number; // pax totali in IN_QUEUE
    waitlistUsers: number; // quante richieste
    paidPeople: number; // pax pagati
    capacity: number; // capienza attuale
  };
  pricing: {
    seatPriceEUR: number; // ticket bus
    skipassMode: "GROUP" | "STANDARD";
    avgSkipassEURPerPerson: number; // indicativo
  };
  costs: {
    busFixedEUR: number;
    extrasFixedEUR: number;
  };
  vehicle: {
    type: VehicleType;
    state: VehicleState;
    vendorName?: string;
    notes?: string;
  };
  ops: {
    deadlineMinPeopleISO: string; // YYYY-MM-DD
    minPeopleTarget: number; // soglia interna
    targetMarginEUR: number; // interno (non mostrare ai clienti)
  };
  timeline: Array<{
    id: string;
    atISO: string;
    tone: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS";
    title: string;
    description: string;
  }>;
};

const MOCK: TripOverviewDTO = {
  summary: {
    destinationName: "Gressoney-La-Trinité",
    departureLabel: "18 Gen 2026 • Milano Lampugnano",
    departureAtISO: "2026-01-18T07:00:00Z",
    status: "SOFT_HOLD",
    sla: { level: "YELLOW", label: "Rischio SLA", deadlineLabel: "Check Agenzia" },
  },
  rules: {
    groupThreshold: 21,
    notifyAgencyHoursBefore: 48,
  },
  kpis: {
    waitlistInQueuePeople: 34,
    waitlistUsers: 12,
    paidPeople: 18,
    capacity: 52,
  },
  pricing: {
    seatPriceEUR: 79,
    skipassMode: "GROUP",
    avgSkipassEURPerPerson: 52,
  },
  costs: {
    busFixedEUR: 2100,
    extrasFixedEUR: 220,
  },
  vehicle: {
    type: "COACH",
    state: "SOFT_HOLD",
    vendorName: "Partner MR Logistics",
    notes: "Opzione coach 52pax, conferma entro SLA agenzia.",
  },
  ops: {
    deadlineMinPeopleISO: "2026-01-15",
    minPeopleTarget: 38,
    targetMarginEUR: 500,
  },
  timeline: [
    {
      id: "EV-1",
      atISO: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      tone: "INFO",
      title: "Prezzi gita aggiornati",
      description: "Aggiornato prezzo posto e mix categorie skipass (manuale).",
    },
    {
      id: "EV-2",
      atISO: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      tone: "WARNING",
      title: "SLA in avvicinamento",
      description: "Finestra conferma con partner bus: serve check entro deadline.",
    },
    {
      id: "EV-3",
      atISO: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      tone: "SUCCESS",
      title: "Pagamento ricevuto",
      description: "Confermato gruppo da 4 pax (postazioni allocate).",
    },
  ],
};

function moneyEUR(n: number) {
  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    const sign = n < 0 ? "-" : "";
    return `${sign}€${Math.abs(Math.round(n))}`;
  }
}

function clamp0(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseISODateTime(s: string) {
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "poco fa";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ieri";
  if (d < 7) return `${d} giorni fa`;
  return date.toLocaleDateString("it-IT");
}

function toneForStatus(status: TripStatus) {
  if (status === "CONFIRMED") return "success" as const;
  if (status === "SOFT_HOLD") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "FULL") return "danger" as const;
  return "neutral" as const;
}

function toneForSla(level: SlaLevel) {
  if (level === "GREEN") return "success" as const;
  if (level === "YELLOW") return "warning" as const;
  return "danger" as const;
}

function toneForTimeline(t: TripOverviewDTO["timeline"][number]["tone"]) {
  if (t === "SUCCESS") return "success" as const;
  if (t === "WARNING") return "warning" as const;
  if (t === "CRITICAL") return "danger" as const;
  return "info" as const;
}

export default function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = (params instanceof Promise ? use(params) : params) as { id: string };
  const { id } = resolvedParams;

  const [data, setData] = useState<TripOverviewDTO>(MOCK);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const computed = useMemo(() => {
    const departure = parseISODateTime(data.summary.departureAtISO);

    const slaDeadline = new Date(
      departure.getTime() - clamp0(data.rules.notifyAgencyHoursBefore) * 60 * 60 * 1000
    );

    const diffMs = slaDeadline.getTime() - now.getTime();
    const slaExpired = diffMs <= 0;

    const h = Math.max(0, Math.floor(diffMs / 3600000));
    const m = Math.max(0, Math.floor((diffMs % 3600000) / 60000));
    const s = Math.max(0, Math.floor((diffMs % 60000) / 1000));
    const slaCountdown = slaExpired ? "SCADUTO" : `${h}h ${m}m ${s}s`;

    const totalPeople = clamp0(data.kpis.waitlistInQueuePeople) + clamp0(data.kpis.paidPeople);
    const capacity = clamp0(data.kpis.capacity);
    const fillPct = capacity > 0 ? Math.min(1, totalPeople / capacity) : 0;

    const threshold = clamp0(data.rules.groupThreshold);
    const groupEligible = totalPeople >= threshold;
    const missingToGroup = Math.max(0, threshold - totalPeople);

    const minTarget = clamp0(data.ops.minPeopleTarget);
    const missingToMinTarget = Math.max(0, minTarget - totalPeople);

    const todayISO = toISODate(new Date());
    const deadline = parseISODate(data.ops.deadlineMinPeopleISO);
    const today = parseISODate(todayISO);
    const deadlinePassed = today.getTime() > deadline.getTime();

    // Stima margine “di overview”
    const seatRevenue = clamp0(data.pricing.seatPriceEUR) * clamp0(data.kpis.paidPeople);
    const skipassApprox = clamp0(data.pricing.avgSkipassEURPerPerson) * totalPeople;
    const revenueApprox = seatRevenue + skipassApprox;
    const costsApprox = clamp0(data.costs.busFixedEUR) + clamp0(data.costs.extrasFixedEUR);
    const marginApprox = revenueApprox - costsApprox;

    return {
      departure,
      slaDeadline,
      slaCountdown,
      slaExpired,
      totalPeople,
      capacity,
      fillPct,
      groupEligible,
      missingToGroup,
      missingToMinTarget,
      deadlinePassed,
      revenueApprox,
      costsApprox,
      marginApprox,
    };
  }, [data, now]);

  const statusBadge = data.summary.status;

  return (
    <TripLayout
      id={id}
      activeTab="overview"
      tripSummary={{
        destinationName: data.summary.destinationName,
        departureLabel: data.summary.departureLabel,
        status: statusBadge,
        sla: data.summary.sla,
      }}
    >
      <div className="space-y-8">
        {/* HERO */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Admin Overview
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    {data.summary.destinationName}
                  </h2>
                  <Badge tone={toneForStatus(statusBadge)}>{statusBadge.replace("_", " ")}</Badge>
                  <Badge tone={toneForSla(data.summary.sla.level)}>
                    {data.summary.sla.label}
                    {data.summary.sla.deadlineLabel ? (
                      <span className="ml-2 font-normal text-slate-500">
                        {data.summary.sla.deadlineLabel}
                      </span>
                    ) : null}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    {data.summary.departureLabel}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    Persone totali: <span className="font-black text-slate-900">{computed.totalPeople}</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Bus size={16} className="text-slate-400" />
                    Capienza: <span className="font-black text-slate-900">{computed.capacity}</span>
                  </span>
                </div>
              </div>

              {/* SLA / FILL */}
              <div className="grid w-full grid-cols-1 gap-3 lg:w-[520px] lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Clock size={14} /> SLA partner bus
                    <span
                      className="ml-1 inline-flex items-center text-slate-400"
                      title="Deadline calcolata come Partenza - ore richieste dal partner. Dopo, prezzo/capienza possono cambiare."
                    >
                      <Info size={14} />
                    </span>
                  </div>
                  <div className="text-xl font-black tracking-tight">
                    <span className={computed.slaExpired ? "text-rose-700" : "text-indigo-700"}>
                      {computed.slaCountdown}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Deadline:{" "}
                    <span className="text-slate-700">
                      {computed.slaDeadline.toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-500">Riempimento (stima)</div>
                    <div className="text-xs font-black text-slate-700">
                      {Math.round(computed.fillPct * 100)}%
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-indigo-600"
                      style={{ width: `${Math.round(computed.fillPct * 100)}%` }}
                    />
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Target minimo:{" "}
                    <span className={computed.missingToMinTarget > 0 ? "text-amber-700" : "text-emerald-700"}>
                      {computed.missingToMinTarget > 0
                        ? `mancano ${computed.missingToMinTarget}`
                        : "raggiunto ✓"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/admin/trips/${id}/waitlist`}>
                <Button variant="primary" title="Gestisci inviti e coda">
                  Vai a Waitlist <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link href={`/admin/trips/${id}/numbers`}>
                <Button variant="secondary" title="Prezzi + costi + soglia 21 + minimo margine">
                  Economia
                </Button>
              </Link>
              <Link href={`/admin/trips/${id}/buses`}>
                <Button variant="secondary" title="Gestione mezzi e capienza">
                  Mezzi
                </Button>
              </Link>
              <Link href={`/admin/trips/${id}/audit`}>
                <Button variant="secondary" title="Audit log operativo">
                  Audit
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* KPI GRID */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Users size={16} />}
            label="Persone totali"
            value={`${computed.totalPeople}`}
            sub={
              computed.groupEligible
                ? `Prezzi gruppo: attivi ✓`
                : `Prezzi gruppo: mancano ${computed.missingToGroup}`
            }
            tone={computed.groupEligible ? "success" : "warning"}
          />

          <KpiCard
            icon={<ClipboardList size={16} />}
            label="Waitlist (in coda)"
            value={`${data.kpis.waitlistInQueuePeople} pax`}
            sub={`${data.kpis.waitlistUsers} richieste`}
            tone="info"
          />

          <KpiCard
            icon={<CheckCircle2 size={16} />}
            label="Pagati"
            value={`${data.kpis.paidPeople} pax`}
            sub={`Prezzo posto: ${moneyEUR(data.pricing.seatPriceEUR)}`}
            tone="success"
          />

          <KpiCard
            icon={<Euro size={16} />}
            label="Margine (stima)"
            value={`${computed.marginApprox >= 0 ? "+" : ""}${moneyEUR(computed.marginApprox)}`}
            sub={`Costi fissi: ${moneyEUR(computed.costsApprox)}`}
            tone={computed.marginApprox >= 0 ? "success" : "danger"}
          />
        </div>

        {/* OPS STRIP */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Regola 21 persone</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3">
              <div className="text-sm text-slate-600">
                Prezzi gruppo validi solo se <span className="font-black text-slate-900">≥ {data.rules.groupThreshold}</span> persone.
              </div>
              <div className="mt-3 flex items-center gap-2">
                {computed.groupEligible ? (
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                    <CheckCircle2 size={16} /> Attivo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">
                    <AlertTriangle size={16} /> Mancano {computed.missingToGroup}
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-500">
                  Modalità: <span className="font-black text-slate-900">{data.pricing.skipassMode}</span>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Deadline minimo partecipanti</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3">
              <div className="text-sm text-slate-600">
                Entro <span className="font-black text-slate-900">{data.ops.deadlineMinPeopleISO}</span> va raggiunto il minimo interno.
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Target minimo</div>
                  <div className="text-xl font-black text-slate-900">{data.ops.minPeopleTarget}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-500">Stato</div>
                  <div className={`text-sm font-black ${computed.deadlinePassed ? "text-rose-700" : "text-slate-900"}`}>
                    {computed.deadlinePassed ? "Scaduto" : "Attivo"}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                {computed.missingToMinTarget > 0 ? (
                  <span className="text-amber-700">Mancano {computed.missingToMinTarget} persone</span>
                ) : (
                  <span className="text-emerald-700">Minimo raggiunto ✓</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mezzo</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {data.vehicle.type === "COACH" ? "Coach" : "Midibus"} •{" "}
                    <span className="text-slate-500">{data.vehicle.state.replace("_", " ")}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {data.vehicle.vendorName || "—"}
                  </div>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                  <Bus size={18} />
                </span>
              </div>

              {data.vehicle.notes ? (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  {data.vehicle.notes}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* TIMELINE */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attività recente</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <div className="space-y-3">
              {data.timeline.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                      {e.tone === "SUCCESS" ? (
                        <CheckCircle2 size={16} />
                      ) : e.tone === "WARNING" ? (
                        <AlertTriangle size={16} />
                      ) : e.tone === "CRITICAL" ? (
                        <ShieldAlert size={16} />
                      ) : (
                        <Activity size={16} />
                      )}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-black text-slate-900">{e.title}</div>
                        <Badge tone={toneForTimeline(e.tone)}>{e.tone}</Badge>
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-600">{e.description}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-500">{formatRelativeTime(e.atISO)}</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                      <Calendar size={14} />
                      {new Date(e.atISO).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900/70">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-amber-700 ring-1 ring-amber-100">
                <ShieldAlert size={16} />
              </span>
              <div className="min-w-0">
                <div className="font-black text-amber-900">Nota operativa</div>
                <div className="mt-1">
                  Se l’SLA va in <span className="font-black">SCADUTO</span>, aspettati variazioni su prezzo e disponibilità bus.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FOOTER MINI-ACTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-500">
            Trip ID: <span className="font-black text-slate-900">{id}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                // Mock action: in futuro audit log + backend
                setData((prev) => ({
                  ...prev,
                  timeline: [
                    {
                      id: `EV-${Date.now()}`,
                      atISO: new Date().toISOString(),
                      tone: "INFO",
                      title: "Snapshot salvato",
                      description: "Salvato stato overview (mock).",
                    },
                    ...prev.timeline,
                  ],
                }));
                console.log("[OVERVIEW] Snapshot", { id, data });
              }}
              title="Salva snapshot (mock)"
            >
              Salva snapshot
            </Button>

            <Link href="/admin/trips">
              <Button variant="secondary">Torna alla lista</Button>
            </Link>
          </div>
        </div>
      </div>
    </TripLayout>
  );
}

/** =========================
 * COMPONENTI
 * ========================= */
function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "info" | "success" | "warning" | "danger" | "neutral";
}) {
  const toneClasses: Record<typeof tone, string> = {
    info: "bg-indigo-50 text-indigo-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
    neutral: "bg-slate-50 text-slate-700",
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ring-1 ring-slate-200 ${toneClasses[tone]}`}
          >
            {icon}
          </span>
          {label}
        </div>

        <div className="text-2xl font-black tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">{sub}</div>
      </CardContent>
    </Card>
  );
}

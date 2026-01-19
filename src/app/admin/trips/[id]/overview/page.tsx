"use client";

import React, { use, useMemo, useState } from "react";
import {
  Calculator,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Info,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { TripLayout, TripStatus, SlaLevel } from "@/components/admin/TripLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * NUMERI (Admin)
 * - Prezzi skipass (gruppo) variano per data e si inseriscono manualmente
 * - Prezzo gruppo applicabile SOLO se tot persone >= 21
 * - Quantità a 0 escluse dai calcoli
 * - Baby contano come persone (logistica/bus), ma skipass può essere 0 (gratis)
 */

type PriceMode = "GROUP" | "STANDARD";

type CategoryKey =
  | "ADULT_GROUP"
  | "SENIOR_65PLUS"
  | "YOUNG_U24"
  | "JUNIOR_U16"
  | "BABY_U8_FREE"
  | "BABY_U8_UNACCOMPANIED";

type SkipassCategory = {
  key: CategoryKey;
  label: string;
  note: string;
  qty: number; // 0 escluso dai calcoli economici (ma può contare nelle persone)
  skipassFree: boolean; // true => prezzo skipass = 0
  countsAsPerson: boolean; // true => conta nel totale persone per bus/soglia 21
  pricesByDate: Record<
    string, // YYYY-MM-DD
    {
      group: number; // prezzo gruppo per quella data
      standard: number; // prezzo standard per quella data
    }
  >;
};

type TripNumbersDTO = {
  summary: {
    destinationName: string;
    departureLabel: string;
    status: TripStatus;
    sla: { level: SlaLevel; label: string; deadlineLabel?: string };
  };
  rules: {
    groupThreshold: number; // 21
  };
  controls: {
    tripDateISO: string; // YYYY-MM-DD
    deadlineMinPeopleISO: string; // data limite entro cui raggiungere minimo
    manualConfirmed: boolean; // conferma manuale admin
    targetMarginEUR: number; // margine target (solo admin)
  };
  costs: {
    busFixedEUR: number; // costo bus fisso
    extrasFixedEUR: number; // extra fissi (assicurazione, staff, ecc.)
    variablePerPersonEUR: number; // costo variabile per persona (0 = ignorato)
  };
  categories: SkipassCategory[];
};

const MOCK: TripNumbersDTO = {
  summary: {
    destinationName: "Gressoney-La-Trinité",
    departureLabel: "18 Gen 2026 • Milano Lampugnano",
    status: "SOFT_HOLD",
    sla: { level: "YELLOW", label: "Rischio SLA", deadlineLabel: "Scade tra 14h" },
  },
  rules: { groupThreshold: 21 },
  controls: {
    tripDateISO: "2026-01-18",
    deadlineMinPeopleISO: "2026-01-15",
    manualConfirmed: false,
    targetMarginEUR: 500,
  },
  costs: {
    busFixedEUR: 2100,
    extrasFixedEUR: 220,
    variablePerPersonEUR: 0, // 0 => escluso
  },
  categories: [
    {
      key: "ADULT_GROUP",
      label: "Adulto Gruppo",
      note: "nati 1961–2001",
      qty: 22,
      skipassFree: false,
      countsAsPerson: true,
      pricesByDate: {
        "2026-01-18": { group: 57, standard: 69 },
      },
    },
    {
      key: "SENIOR_65PLUS",
      label: "Senior >65 Gruppo",
      note: "nati prima del 1961",
      qty: 4,
      skipassFree: false,
      countsAsPerson: true,
      pricesByDate: {
        "2026-01-18": { group: 53, standard: 65 },
      },
    },
    {
      key: "YOUNG_U24",
      label: "Young <24 Gruppo",
      note: "nati 2001+",
      qty: 3,
      skipassFree: false,
      countsAsPerson: true,
      pricesByDate: {
        "2026-01-18": { group: 49, standard: 60 },
      },
    },
    {
      key: "JUNIOR_U16",
      label: "Junior <16 Gruppo",
      note: "nati 2010+",
      qty: 2,
      skipassFree: false,
      countsAsPerson: true,
      pricesByDate: {
        "2026-01-18": { group: 36, standard: 45 },
      },
    },
    {
      key: "BABY_U8_FREE",
      label: "Baby <8 (gratis)",
      note: "accompagnato",
      qty: 1,
      skipassFree: true,
      countsAsPerson: true,
      pricesByDate: {
        "2026-01-18": { group: 0, standard: 0 },
      },
    },
    {
      key: "BABY_U8_UNACCOMPANIED",
      label: "Baby <8 non accompagnato",
      note: "regola speciale",
      qty: 0,
      skipassFree: true,
      countsAsPerson: true,
      pricesByDate: {
        "2026-01-18": { group: 0, standard: 0 },
      },
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

function clamp0(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseISODate(s: string) {
  // YYYY-MM-DD -> Date (locale-safe)
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

export default function TripNumbersPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = (params instanceof Promise ? use(params) : params) as { id: string };
  const { id } = resolvedParams;

  const [data, setData] = useState<TripNumbersDTO>(MOCK);

  const groupThreshold = data.rules.groupThreshold;

  const totals = useMemo(() => {
    const tripDate = data.controls.tripDateISO;

    const totalPeople = data.categories
      .filter((c) => c.countsAsPerson)
      .reduce((acc, c) => acc + clamp0(c.qty), 0);

    const priceMode: PriceMode = totalPeople >= groupThreshold ? "GROUP" : "STANDARD";

    const revenueSkipass = data.categories.reduce((acc, c) => {
      const qty = clamp0(c.qty);
      if (qty === 0) return acc; // 0 escluso
      if (c.skipassFree) return acc; // baby gratis: skipass 0
      const p = c.pricesByDate[tripDate] || { group: 0, standard: 0 };
      const unit = priceMode === "GROUP" ? clamp0(p.group) : clamp0(p.standard);
      return acc + unit * qty;
    }, 0);

    const variable = clamp0(data.costs.variablePerPersonEUR);
    const costsTotal =
      clamp0(data.costs.busFixedEUR) + clamp0(data.costs.extrasFixedEUR) + variable * totalPeople;

    const margin = revenueSkipass - costsTotal;

    // Ricavo medio "per persona" (inclusi baby => più conservativo)
    const avgRevenuePerPerson = totalPeople > 0 ? revenueSkipass / totalPeople : 0;

    // Minimo persone stimato per raggiungere margine target,
    // assumendo che il mix rimanga simile (ricavo medio costante).
    // Se avgRevenuePerPerson è troppo basso, il minimo non è calcolabile in modo sensato.
    const target = clamp0(data.controls.targetMarginEUR);
    const fixedCosts = clamp0(data.costs.busFixedEUR) + clamp0(data.costs.extrasFixedEUR);
    const perPersonCost = variable;

    const canEstimateMin = avgRevenuePerPerson > perPersonCost + 0.01; // evita divisioni “infinite”
    const minPeopleForTarget = canEstimateMin
      ? Math.ceil((fixedCosts + target) / (avgRevenuePerPerson - perPersonCost))
      : null;

    const missingToThreshold = Math.max(0, groupThreshold - totalPeople);
    const missingToTarget =
      minPeopleForTarget === null ? null : Math.max(0, minPeopleForTarget - totalPeople);

    // Stato conferma (manuale o automatico per data limite)
    const todayISO = toISODate(new Date());
    const today = parseISODate(todayISO);
    const deadline = parseISODate(data.controls.deadlineMinPeopleISO);
    const deadlinePassed = today.getTime() > deadline.getTime();
    const autoOk = minPeopleForTarget !== null ? totalPeople >= minPeopleForTarget : false;
    const confirmed = data.controls.manualConfirmed || (deadlinePassed && autoOk);

    return {
      tripDate,
      totalPeople,
      priceMode,
      revenueSkipass,
      costsTotal,
      margin,
      avgRevenuePerPerson,
      minPeopleForTarget,
      missingToThreshold,
      missingToTarget,
      confirmed,
      deadlinePassed,
    };
  }, [data]);

  const setQty = (key: CategoryKey, nextQty: number) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.key === key ? { ...c, qty: clamp0(Math.floor(nextQty)) } : c
      ),
    }));
  };

  const setPrice = (key: CategoryKey, mode: "group" | "standard", next: number) => {
    setData((prev) => {
      const date = prev.controls.tripDateISO;
      return {
        ...prev,
        categories: prev.categories.map((c) => {
          if (c.key !== key) return c;
          const current = c.pricesByDate[date] || { group: 0, standard: 0 };
          return {
            ...c,
            pricesByDate: {
              ...c.pricesByDate,
              [date]: {
                ...current,
                [mode]: clamp0(next),
              },
            },
          };
        }),
      };
    });
  };

  const toggleManualConfirmed = () => {
    setData((prev) => ({
      ...prev,
      controls: { ...prev.controls, manualConfirmed: !prev.controls.manualConfirmed },
      summary: {
        ...prev.summary,
        status: !prev.controls.manualConfirmed ? "CONFIRMED" : "SOFT_HOLD",
      },
    }));
  };

  const statusBadge = totals.confirmed ? ("CONFIRMED" as TripStatus) : data.summary.status;

  return (
    <TripLayout
      id={id}
      activeTab="numbers"
      tripSummary={{
        ...data.summary,
        status: statusBadge,
        sla: data.summary.sla,
      }}
    >
      <div className="space-y-8">
        {/* Header */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-500">Numeri</div>
                <div className="text-xl font-bold tracking-tight text-slate-900">
                  {data.summary.destinationName}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={14} /> {data.summary.departureLabel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} /> Persone totali:{" "}
                    <span className="font-bold text-slate-900">{totals.totalPeople}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge tone={toneForStatus(statusBadge)}>
                  {statusBadge.replace("_", " ")}
                </Badge>
                <Badge tone={toneForSla(data.summary.sla.level)}>
                  {data.summary.sla.label}
                  {data.summary.sla.deadlineLabel ? (
                    <span className="ml-2 font-normal text-slate-500">
                      {data.summary.sla.deadlineLabel}
                    </span>
                  ) : null}
                </Badge>
              </div>
            </div>

            {/* Admin controls quick strip */}
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Calendar size={14} /> Data gita (manuale)
                  <span
                    className="ml-1 inline-flex items-center text-slate-400"
                    title="La data decide i prezzi inseriti per categoria. Prezzi gruppo/standard sono per quella data."
                  >
                    <Info size={14} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={data.controls.tripDateISO}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        controls: { ...prev.controls, tripDateISO: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <TrendingUp size={14} /> Margine target (solo admin)
                  <span
                    className="ml-1 inline-flex items-center text-slate-400"
                    title="Serve per calcolare il minimo stimato di partecipanti. Non mostrare ai clienti."
                  >
                    <Info size={14} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.controls.targetMarginEUR}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        controls: { ...prev.controls, targetMarginEUR: clamp0(Number(e.target.value)) },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <div className="text-sm font-bold text-slate-700">€</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CheckCircle2 size={14} /> Data limite minimo
                  <span
                    className="ml-1 inline-flex items-center text-slate-400"
                    title="Se entro questa data non si raggiunge il minimo stimato, la gita resta non confermata (o va gestita manualmente)."
                  >
                    <Info size={14} />
                  </span>
                </div>
                <input
                  type="date"
                  value={data.controls.deadlineMinPeopleISO}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      controls: { ...prev.controls, deadlineMinPeopleISO: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant={data.controls.manualConfirmed ? "secondary" : "primary"}
                onClick={toggleManualConfirmed}
                title="Conferma manualmente (solo admin)."
              >
                {data.controls.manualConfirmed ? "Togli conferma manuale" : "Conferma gita (manuale)"}
              </Button>

              <a href={`/admin/trips/${id}/overview`}>
                <Button variant="secondary">Overview</Button>
              </a>
              <a href={`/admin/trips/${id}/buses`}>
                <Button variant="secondary">Mezzi</Button>
              </a>
              <a href={`/admin/trips/${id}/waitlist`}>
                <Button variant="secondary">Waitlist</Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                  <Users size={16} />
                </span>
                Persone totali
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">{totals.totalPeople}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Soglia gruppo: {data.rules.groupThreshold}{" "}
                {totals.totalPeople >= data.rules.groupThreshold ? (
                  <span className="text-emerald-700">✓ raggiunta</span>
                ) : (
                  <span className="text-amber-700">mancano {totals.missingToThreshold}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                  <ClipboardList size={16} />
                </span>
                Prezzi applicati
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {totals.priceMode === "GROUP" ? "Gruppo" : "Standard"}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Regola: gruppo solo se ≥ {data.rules.groupThreshold} persone
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                  <Wallet size={16} />
                </span>
                Ricavi skipass stimati
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {moneyEUR(totals.revenueSkipass)}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Baby gratis inclusi (ricavo 0)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                  <Calculator size={16} />
                </span>
                Margine stimato
              </div>
              <div className="text-2xl font-bold tracking-tight">
                <span className={totals.margin >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  {totals.margin >= 0 ? "+" : ""}
                  {moneyEUR(totals.margin)}
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Costi totali: {moneyEUR(totals.costsTotal)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Min required */}
        <Card>
          <CardHeader>
            <CardTitle>Minimo partecipanti per margine target</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <TrendingUp size={14} /> Margine target
                </div>
                <div className="text-xl font-bold text-slate-900">{moneyEUR(data.controls.targetMarginEUR)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  (solo admin, non mostrarlo ai clienti)
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Users size={14} /> Minimo stimato
                  <span
                    className="ml-1 inline-flex items-center text-slate-400"
                    title="Stima basata sul ricavo medio per persona del mix attuale. Se cambi le quantità o i prezzi, la stima cambia."
                  >
                    <Info size={14} />
                  </span>
                </div>

                {totals.minPeopleForTarget === null ? (
                  <div className="text-sm font-semibold text-amber-700">
                    Non stimabile: ricavo medio troppo basso rispetto ai costi variabili.
                  </div>
                ) : (
                  <>
                    <div className="text-xl font-bold text-slate-900">{totals.minPeopleForTarget}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      Mancano{" "}
                      <span className={totals.missingToTarget && totals.missingToTarget > 0 ? "text-amber-700" : "text-emerald-700"}>
                        {totals.missingToTarget ?? "—"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CheckCircle2 size={14} /> Stato conferma
                </div>
                <div className="text-xl font-bold">
                  {totals.confirmed ? (
                    <span className="text-emerald-700">Confermata</span>
                  ) : (
                    <span className="text-amber-700">Non confermata</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Limite: {data.controls.deadlineMinPeopleISO}{" "}
                  {totals.deadlinePassed ? (
                    <span className="font-semibold text-rose-700">(scaduto)</span>
                  ) : (
                    <span className="font-semibold text-slate-600">(attivo)</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Costs + categories table */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Costs */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Costi (admin)</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="mb-1 text-xs font-bold text-slate-500">Costo bus (fisso)</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={data.costs.busFixedEUR}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          costs: { ...prev.costs, busFixedEUR: clamp0(Number(e.target.value)) },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <div className="text-sm font-bold text-slate-700">€</div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs font-bold text-slate-500">Extra fissi</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={data.costs.extrasFixedEUR}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          costs: { ...prev.costs, extrasFixedEUR: clamp0(Number(e.target.value)) },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <div className="text-sm font-bold text-slate-700">€</div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                    Costo variabile per persona
                    <span
                      className="ml-1 inline-flex items-center text-slate-400"
                      title="Se metti 0, viene escluso dai calcoli (come da regola)."
                    >
                      <Info size={14} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={data.costs.variablePerPersonEUR}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          costs: { ...prev.costs, variablePerPersonEUR: clamp0(Number(e.target.value)) },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <div className="text-sm font-bold text-slate-700">€/pax</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">Nota</div>
                  <div className="mt-1 text-sm text-slate-700">
                    Il minimo stimato usa il <span className="font-semibold">mix attuale</span> (quantità e prezzi).
                    Cambiando le categorie, cambia tutto.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Categories */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Skipass per categoria (quantità + prezzi manuali)</CardTitle>
              </CardHeader>

              <div className="overflow-hidden rounded-2xl border-t border-slate-200">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500">Categoria</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-500">
                        Q.tà
                      </th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500">
                        Prezzo gruppo
                      </th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500">
                        Prezzo standard
                      </th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500">
                        Totale
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {data.categories.map((c) => {
                      const date = data.controls.tripDateISO;
                      const p = c.pricesByDate[date] || { group: 0, standard: 0 };
                      const qty = clamp0(c.qty);

                      const unit =
                        totals.priceMode === "GROUP" ? clamp0(p.group) : clamp0(p.standard);

                      const rowTotal = c.skipassFree || qty === 0 ? 0 : unit * qty;

                      return (
                        <tr key={c.key} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{c.label}</div>
                            <div className="text-xs font-semibold text-slate-500">{c.note}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {c.skipassFree ? <Badge tone="success">Skipass €0</Badge> : null}
                              {c.countsAsPerson ? <Badge tone="info">Conta come persona</Badge> : null}
                              {qty === 0 ? <Badge tone="neutral">Q.tà = 0 (esclusa)</Badge> : null}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              value={qty}
                              min={0}
                              onChange={(e) => setQty(c.key, Number(e.target.value))}
                              className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <input
                                type="number"
                                value={p.group}
                                min={0}
                                onChange={(e) => setPrice(c.key, "group", Number(e.target.value))}
                                className="w-24 rounded-xl border border-slate-200 px-2 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-200"
                                disabled={c.skipassFree}
                              />
                              <span className="text-sm font-bold text-slate-700">€</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <input
                                type="number"
                                value={p.standard}
                                min={0}
                                onChange={(e) => setPrice(c.key, "standard", Number(e.target.value))}
                                className="w-24 rounded-xl border border-slate-200 px-2 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-200"
                                disabled={c.skipassFree}
                              />
                              <span className="text-sm font-bold text-slate-700">€</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right text-sm font-bold">
                            {rowTotal === 0 ? (
                              <span className="text-slate-500">—</span>
                            ) : (
                              <span className="text-slate-900">{moneyEUR(rowTotal)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <CardContent className="p-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                      <Info size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">Regole importanti</div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        <li>
                          • Prezzi <span className="font-semibold">gruppo</span> validi solo se{" "}
                          <span className="font-semibold">tot persone ≥ {data.rules.groupThreshold}</span>.
                        </li>
                        <li>
                          • Quantità <span className="font-semibold">0</span> non entra nei calcoli (né ricavi né altro).
                        </li>
                        <li>
                          • Baby contano come persone (bus/logistica), ma skipass può essere <span className="font-semibold">€0</span>.
                        </li>
                        <li>
                          • “Minimo stimato” è una stima basata sul mix attuale: è utile come bussola, non come legge fisica.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TripLayout>
  );
}

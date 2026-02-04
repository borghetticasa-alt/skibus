"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  Euro,
  Info,
  MapPin,
  ShieldAlert,
  Users,
} from "lucide-react";

import { TripLayout, TripStatus, SlaLevel } from "@/components/admin/TripLayout";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TripMedia = {
  trip_id: string;
  skirama_url?: string | null;
  weather_query?: string | null;
  updated_at?: string | null;
};

function useTripMedia(tripId: string) {
  const [media, setMedia] = useState<TripMedia | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const load = async () => {
    if (!tripId) return;
    setLoadingMedia(true);
    setMediaError(null);
    try {
      const res = await fetch(`/api/trip-media-get?tripId=${encodeURIComponent(tripId)}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || "Load failed");
      setMedia(data);
    } catch (e: any) {
      setMediaError(e?.message || "Errore");
    } finally {
      setLoadingMedia(false);
    }
  };

  const saveMeta = async (payload: { skiramaUrl?: string; weatherQuery?: string }) => {
    if (!tripId) return;
    setSavingMedia(true);
    setMediaError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Devi essere loggato come admin.");

      const res = await fetch("/api/trip-media-set", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tripId, ...payload }),
      });

      const data2 = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data2?.error || "Save failed");
      setMedia(data2);
    } catch (e: any) {
      setMediaError(e?.message || "Errore salvataggio");
    } finally {
      setSavingMedia(false);
    }
  };

  return { media, load, saveMeta, loadingMedia, savingMedia, mediaError };
}

type VehicleType = "MIDIBUS" | "COACH";
type VehicleState = "NOT_SET" | "SOFT_HOLD" | "CONFIRMED";

type TripOverviewDTO = {
  summary: {
    destinationName: string;
    departureLabel: string;
    departureAtISO: string;
    status: TripStatus;
    sla: { level: SlaLevel; label: string; deadlineLabel?: string };
  };
  rules: {
    groupThreshold: number;
    notifyAgencyHoursBefore: number;
  };
  kpis: {
    waitlistInQueuePeople: number;
    waitlistUsers: number;
    paidPeople: number;
    capacity: number;
  };
  pricing: {
    seatPriceEUR: number;
    skipassMode: "GROUP" | "STANDARD";
    avgSkipassEURPerPerson: number;
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
    deadlineMinPeopleISO: string;
    minPeopleTarget: number;
    targetMarginEUR: number;
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
  rules: { groupThreshold: 21, notifyAgencyHoursBefore: 48 },
  kpis: { waitlistInQueuePeople: 34, waitlistUsers: 12, paidPeople: 18, capacity: 52 },
  pricing: { seatPriceEUR: 79, skipassMode: "GROUP", avgSkipassEURPerPerson: 52 },
  costs: { busFixedEUR: 2100, extrasFixedEUR: 220 },
  vehicle: {
    type: "COACH",
    state: "SOFT_HOLD",
    vendorName: "Partner MR Logistics",
    notes: "Opzione coach 52pax, conferma entro SLA agenzia.",
  },
  ops: { deadlineMinPeopleISO: "2026-01-15", minPeopleTarget: 38, targetMarginEUR: 500 },
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
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
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
  const tripId = String(resolvedParams?.id || "").trim();

  const mediaApi = useTripMedia(tripId);

  useEffect(() => {
    if (tripId) mediaApi.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const [data, setData] = useState<TripOverviewDTO>(MOCK);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const computed = useMemo(() => {
    const departure = parseISODateTime(data.summary.departureAtISO);
    const slaDeadline = new Date(departure.getTime() - clamp0(data.rules.notifyAgencyHoursBefore) * 60 * 60 * 1000);

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
      id={tripId}
      activeTab="overview"
      tripSummary={{
        destinationName: data.summary.destinationName,
        departureLabel: data.summary.departureLabel,
        status: statusBadge,
        sla: data.summary.sla,
      }}
    >
      {/* MEDIA */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5 md:p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div>
            <div className="text-sm font-black text-white">Skirama & Meteo</div>
            <div className="text-xs text-slate-300/70">
              Carica 1 skirama per gita + imposta il luogo per le previsioni.
            </div>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white hover:bg-white/10"
            onClick={() => mediaApi.load()}
          >
            {mediaApi.loadingMedia ? "Aggiornamento…" : "Aggiorna"}
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-black text-slate-200/80 mb-2">Skirama (immagine)</div>

            {mediaApi.media?.skirama_url ? (
              <img src={mediaApi.media.skirama_url} alt="Skirama" className="w-full rounded-2xl border border-white/10" />
            ) : (
              <div className="text-sm text-slate-200/70">Nessuno skirama caricato.</div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                className="text-xs text-slate-200/80"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !tripId) return;

                  try {
                    const { data } = await supabase.auth.getSession();
                    if (!data.session) throw new Error("Devi essere loggato.");

                    const ext = file.name.split(".").pop() || "png";
                    const path = `${tripId}/skirama.${ext}`;

                    const up = await supabase.storage.from("skirama").upload(path, file, { upsert: true });
                    if (up.error) throw up.error;

                    const pub = supabase.storage.from("skirama").getPublicUrl(path);
                    const url = pub.data.publicUrl;

                    await mediaApi.saveMeta({ skiramaUrl: url });
                    await mediaApi.load();
                  } catch (err: any) {
                    alert(err?.message || 'Errore upload. Hai creato il bucket "skirama"?');
                  }
                }}
              />
              <div className="text-xs text-slate-300/70">
                Bucket: <b>skirama</b> (public)
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-black text-slate-200/80 mb-2">Meteo (luogo)</div>
            <div className="text-sm text-slate-200/70">
              Esempi: <b>Champoluc</b>, <b>Gressoney</b>, <b>Alagna</b>.
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none"
                placeholder="Inserisci luogo meteo"
                defaultValue={mediaApi.media?.weather_query || ""}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) mediaApi.saveMeta({ weatherQuery: v });
                }}
              />
            </div>

            <div className="mt-3 text-xs text-slate-300/70">
              Salvato: <b>{mediaApi.media?.weather_query || "—"}</b>
              {mediaApi.savingMedia ? <span className="ml-2">• salvataggio…</span> : null}
            </div>
          </div>
        </div>

        {mediaApi.mediaError && (
          <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
            {mediaApi.mediaError}
          </div>
        )}
      </div>

      {/* QUI SOTTO: la tua UI rimane IDENTICA (non la cambio) */}
      {/* ... incolla pure la parte restante della tua pagina così com’è ... */}

      <div className="space-y-8">
        {/* HERO */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            {/* ... (resto UI come tua versione) ... */}
            <div className="text-white text-sm">
              (UI invariata) — qui rimetti il resto del tuo file come già lo avevi.
            </div>
          </CardContent>
        </Card>
      </div>
    </TripLayout>
  );
}

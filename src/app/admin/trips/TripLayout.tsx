"use client";

import React from "react";
import Link from "next/link";
import { Bus, ChevronLeft, MapPin, ShieldCheck } from "lucide-react";

import TripNavigation from "@/components/admin/TripNavigation";

export type TripStatus =
  | "DRAFT"
  | "SOFT_HOLD"
  | "CONFIRMED"
  | "LOCKED"
  | "FULL"
  | "CANCELLED";

export type SlaLevel = "GREEN" | "YELLOW" | "RED";

export interface TripSummary {
  destinationName: string;
  departureLabel: string;
  status: TripStatus;
  sla: {
    level: SlaLevel;
    label: string;
    deadlineLabel?: string;
  };
}

interface Props {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  tripSummary?: TripSummary;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const statusPill: Record<TripStatus, { bg: string; dot: string; text: string }> = {
  DRAFT: { bg: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400", text: "Draft" },
  SOFT_HOLD: { bg: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", text: "Soft hold" },
  CONFIRMED: { bg: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", text: "Confirmed" },
  LOCKED: { bg: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500", text: "Locked" },
  FULL: { bg: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500", text: "Full" },
  CANCELLED: { bg: "bg-slate-900 text-slate-100 ring-slate-700", dot: "bg-slate-300", text: "Cancelled" },
};

const slaPill: Record<SlaLevel, { bg: string; dot: string; text: string }> = {
  GREEN: { bg: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", text: "OK" },
  YELLOW: { bg: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", text: "Warning" },
  RED: { bg: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500", text: "Critical" },
};

function Pill({
  tone,
  leftDot,
  children,
}: {
  tone: string;
  leftDot: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ring-1",
        tone
      )}
    >
      <span className={cx("h-2 w-2 rounded-full", leftDot)} />
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}

export const TripLayout: React.FC<Props> = ({ id, activeTab, children, tripSummary }) => {
  const destination = tripSummary?.destinationName || "Monte Rosa Bus";
  const departure = tripSummary?.departureLabel || "Admin Console";

  const currentStatus = tripSummary?.status;
  const currentSla = tripSummary?.sla;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Gradient brand bar */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950" />
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.20),transparent_55%)]" />
        <div className="relative">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/80">
              <Bus size={14} className="text-indigo-300" />
              Monte Rosa Bus <span className="text-white/40">/</span>
              <span className="text-indigo-200">Admin</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-white/60">
              <ShieldCheck size={14} className="text-emerald-300" />
              Console secure
            </div>
          </div>
        </div>
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Left */}
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/admin/trips"
              className="group inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
              title="Torna alla lista gite"
            >
              <ChevronLeft size={18} className="transition group-hover:-translate-x-0.5" />
              <span className="ml-1 hidden sm:inline text-xs font-black">Trips</span>
            </Link>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-black tracking-tight text-slate-900">
                  {destination}
                </h1>

                {currentStatus ? (
                  <Pill tone={statusPill[currentStatus].bg} leftDot={statusPill[currentStatus].dot}>
                    {statusPill[currentStatus].text}
                  </Pill>
                ) : null}
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                <MapPin size={14} className="text-slate-400" />
                <span className="truncate">{departure}</span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {/* SLA */}
            <div className="hidden md:block text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                SLA health
              </div>

              <div className="mt-1 flex flex-col items-end gap-1">
                {currentSla ? (
                  <>
                    <Pill tone={slaPill[currentSla.level].bg} leftDot={slaPill[currentSla.level].dot}>
                      {currentSla.label}
                    </Pill>
                    {currentSla.deadlineLabel ? (
                      <div className="text-[10px] font-bold text-slate-400">
                        {currentSla.deadlineLabel}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-xs font-bold text-slate-300">—</div>
                )}
              </div>
            </div>

            <div className="hidden md:block h-10 w-px bg-slate-200" />

            {/* Avatar */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-black text-slate-900">Ops Manager</div>
                <div className="text-[10px] font-bold text-slate-400">Console Admin</div>
              </div>

              <div
                className={cx(
                  "h-11 w-11 overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-2 ring-indigo-200/60",
                  "border border-white"
                )}
                title="Admin"
              >
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"
                  alt="Admin Avatar"
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sub-nav */}
        <div className="mx-auto max-w-7xl px-6 pb-4">
          <TripNavigation tripId={id} activeTab={activeTab} />
        </div>
      </div>

      {/* Background pattern */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.10),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.08),transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,black_1px,transparent_1px),linear-gradient(to_bottom,black_1px,transparent_1px)] [background-size:28px_28px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-8">
          <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">{children}</main>

          <div className="mt-10 border-t border-slate-200/70 pt-6 text-[10px] font-bold text-slate-400">
            Internal ops UI • Trip: <span className="font-black text-slate-600">{id}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
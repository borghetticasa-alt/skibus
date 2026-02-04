"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PublicTripNavigation(props: { tripId?: string }) {
  const params = useParams();
  const idFromParams = typeof (params as any)?.id === "string" ? ((params as any).id as string) : "";
  const finalTripId = String(props.tripId || idFromParams || "").trim();

  if (!finalTripId) return null;

  return (
    <nav
      className="w-full rounded-2xl border border-white/10 bg-slate-950/30 p-1.5"
      aria-label="Trip navigation"
    >
      <div className="flex items-center gap-2">
        <Link
          href={`/trips/${finalTripId}`}
          className="flex items-center whitespace-nowrap px-5 py-2.5 text-sm font-black rounded-xl bg-white/10 text-white border border-white/10"
        >
          Dettagli
        </Link>

        <Link
          href="/trips"
          className="flex items-center whitespace-nowrap px-5 py-2.5 text-sm font-black rounded-xl text-slate-200/80 hover:text-white hover:bg-white/5 border border-transparent"
        >
          Tutte le gite
        </Link>
      </div>
    </nav>
  );
}

import React from "react";
import { Bus, Calendar, ArrowRight, AlertCircle } from "lucide-react";

// ✅ UI components con alias @ (pulito)
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TRIPS_MOCK = [
  {
    id: "mr-001",
    destination: "Gressoney-La-Trinité",
    date: "2025-02-22",
    status: "CONFIRMED",
    seats_sold: 48,
    capacity: 52,
    sla: "GREEN",
    alerts: 0,
  },
  {
    id: "mr-002",
    destination: "Champoluc",
    date: "2025-02-23",
    status: "SOFT_HOLD",
    seats_sold: 12,
    capacity: 20,
    sla: "YELLOW",
    alerts: 2,
  },
];

function toneForStatus(status: string) {
  if (status === "CONFIRMED") return "success" as const;
  if (status === "SOFT_HOLD") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "FULL") return "danger" as const;
  return "neutral" as const;
}

export default function TripsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Viaggi programmati
          </h1>
          <p className="text-sm text-slate-500">
            Gestione partenze e capienza bus
          </p>
        </div>

        <Button variant="primary">+ Nuovo viaggio</Button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {TRIPS_MOCK.map((trip) => {
            const occupancy = Math.round(
              (trip.seats_sold / trip.capacity) * 100
            );

            return (
              <a
                key={trip.id}
                href={`/admin/trips/${trip.id}/overview`}
                className="group flex items-center justify-between px-6 py-5 hover:bg-slate-50"
              >
                {/* Left */}
                <div className="flex items-center gap-6">
                  <div
                    className={`h-10 w-1.5 rounded-full ${
                      trip.sla === "GREEN"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                  />

                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold text-slate-900">
                        {trip.destination}
                      </h2>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500">
                        {trip.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {trip.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bus size={12} /> {trip.capacity} posti
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-8">
                  {/* Occupancy */}
                  <div className="w-40">
                    <div className="mb-1 flex justify-between text-[10px] font-medium text-slate-400">
                      <span>Occupazione</span>
                      <span>{occupancy}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <Badge tone={toneForStatus(trip.status)}>{trip.status}</Badge>

                  {/* Alerts */}
                  {trip.alerts > 0 && (
                    <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      <AlertCircle size={14} />
                      {trip.alerts}
                    </div>
                  )}

                  <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Footer action */}
      <div className="flex gap-2">
        <a href="/admin">
          <Button variant="secondary">Torna Admin</Button>
        </a>
      </div>
    </div>
  );
}

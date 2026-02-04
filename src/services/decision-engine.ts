
// src/services/decision-engine.ts
// Decision engine "minimo vitale".
// Serve per sbloccare la build: puoi arricchirlo dopo con logiche KPI/margini.

export type EvaluateTripInput = {
  tripId?: string;

  // numeri base (tutto opzionale: se manca qualcosa, non esplode)
  participants?: number;
  capacity?: number;

  // soglie (es. 21 persone)
  groupThreshold?: number;

  // margine / economia (opzionale)
  targetMarginEUR?: number;
  revenueEUR?: number;
  costEUR?: number;

  // date SLA (opzionale)
  departureAtISO?: string;
  notifyAgencyHoursBefore?: number;
};

export type TripDecision = {
  status: "DRAFT" | "SOFT_HOLD" | "CONFIRMED" | "FULL" | "CANCELLED";
  sla: { level: "GREEN" | "YELLOW" | "RED"; label: string };
  flags: {
    groupEligible: boolean;
    capacityReached: boolean;
    marginOk: boolean;
    slaExpired: boolean;
  };
  metrics: {
    participants: number;
    capacity: number;
    available: number;
    groupThreshold: number;
    marginEUR: number;
  };
};

// helper safe number
function n0(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function isSlaExpired(departureAtISO?: string, hoursBefore?: number) {
  if (!departureAtISO) return false;
  const dep = new Date(departureAtISO);
  if (!Number.isFinite(dep.getTime())) return false;

  const h = n0(hoursBefore);
  if (h <= 0) return false;

  const deadline = new Date(dep.getTime() - h * 60 * 60 * 1000);
  return Date.now() > deadline.getTime();
}

export function evaluateTrip(input: EvaluateTripInput = {}): TripDecision {
  const participants = n0(input.participants);
  const capacity = n0(input.capacity);
  const available = Math.max(0, capacity - participants);

  const groupThreshold = Math.max(0, Math.floor(n0(input.groupThreshold) || 21));
  const groupEligible = participants >= groupThreshold;

  const revenue = n0(input.revenueEUR);
  const cost = n0(input.costEUR);
  const margin = revenue - cost;

  const targetMargin = n0(input.targetMarginEUR);
  const marginOk = targetMargin > 0 ? margin >= targetMargin : margin >= 0;

  const slaExpired = isSlaExpired(input.departureAtISO, input.notifyAgencyHoursBefore);

  const capacityReached = capacity > 0 ? participants >= capacity : false;

  // status semplice ma sensato
  let status: TripDecision["status"] = "DRAFT";
  if (capacityReached) status = "FULL";
  else if (groupEligible && marginOk) status = "CONFIRMED";
  else if (participants > 0) status = "SOFT_HOLD";

  // SLA level
  const fillPct = capacity > 0 ? clamp01(participants / capacity) : 0;
  let slaLevel: TripDecision["sla"]["level"] = "GREEN";
  let slaLabel = "OK";

  if (slaExpired) {
    slaLevel = "RED";
    slaLabel = "SLA scaduto";
  } else if (!groupEligible || !marginOk || fillPct < 0.5) {
    slaLevel = "YELLOW";
    slaLabel = "Rischio SLA";
  }

  return {
    status,
    sla: { level: slaLevel, label: slaLabel },
    flags: { groupEligible, capacityReached, marginOk, slaExpired },
    metrics: { participants, capacity, available, groupThreshold, marginEUR: margin },
  };
}

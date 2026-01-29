// src/lib/tripEconomics.ts

export type TripEconomicsInput = {
  busCostTotal: number;          // costo totale bus (somma mezzi)
  fixedCosts: number;            // costi fissi extra (staff, assicurazione, ecc.)
  variableCostPerPax: number;    // costo variabile per pax (fee pagamento, ecc.)
  revenuePerPax: number;         // ricavo medio per pax (ticket base medio)
  targetMargin: number;          // margine obiettivo interno (NON mostrare ai clienti)
};

export type TripDeadlinesInput = {
  departureAtISO: string;        // data/ora partenza
  confirmByISO: string;          // entro questa data si deve raggiungere la soglia
  salesCloseAtISO: string;       // chiusura vendite (può coincidere o essere diversa)
  agencySlaHoursBefore: number;  // SLA agenzia: es. 48 ore prima
};

export function clampMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function ceilInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.ceil(n));
}

/**
 * Calcola:
 * - breakEvenPax: pax per coprire i costi
 * - paxForTargetMargin: pax per ottenere targetMargin
 * - profitAtSold: profit stimato con pax venduti
 */
export function computeTripEconomics(input: TripEconomicsInput, soldPax: number) {
  const totalFixed = input.busCostTotal + input.fixedCosts;
  const contribPerPax = input.revenuePerPax - input.variableCostPerPax;

  // guardrail: se contribPerPax <= 0, non esiste break-even (business rotto)
  const breakEvenPax =
    contribPerPax > 0 ? ceilInt(totalFixed / contribPerPax) : Number.POSITIVE_INFINITY;

  const paxForTargetMargin =
    contribPerPax > 0 ? ceilInt((totalFixed + input.targetMargin) / contribPerPax) : Number.POSITIVE_INFINITY;

  const profitAtSold =
    clampMoney(soldPax * contribPerPax - totalFixed);

  const isViable = contribPerPax > 0;

  return {
    totalFixed: clampMoney(totalFixed),
    contribPerPax: clampMoney(contribPerPax),
    breakEvenPax,
    paxForTargetMargin,
    profitAtSold,
    isViable,
  };
}

export function computeDeadlineStatus(deadlines: TripDeadlinesInput, soldPax: number, neededPax: number) {
  const now = new Date();
  const confirmBy = new Date(deadlines.confirmByISO);
  const salesClose = new Date(deadlines.salesCloseAtISO);
  const departure = new Date(deadlines.departureAtISO);
  const agencyDeadline = new Date(departure.getTime() - deadlines.agencySlaHoursBefore * 3600000);

  const missing = Math.max(0, neededPax - soldPax);

  const reached = soldPax >= neededPax;
  const confirmExpired = now.getTime() > confirmBy.getTime();
  const salesClosed = now.getTime() > salesClose.getTime();
  const agencySlaExpired = now.getTime() > agencyDeadline.getTime();

  // Stato operativo “semplice ma utile”
  let status:
    | 'OK_REACHED'
    | 'OK_NOT_REACHED'
    | 'RISK_CONFIRM_DEADLINE'
    | 'FAILED_CONFIRM_DEADLINE'
    | 'SALES_CLOSED'
    | 'AGENCY_SLA_EXPIRED' = 'OK_NOT_REACHED';

  if (reached) status = 'OK_REACHED';
  else if (confirmExpired) status = 'FAILED_CONFIRM_DEADLINE';
  else {
    // “rischio” quando mancano <= 48h alla confirmBy
    const hoursToConfirm = (confirmBy.getTime() - now.getTime()) / 3600000;
    if (hoursToConfirm <= 48) status = 'RISK_CONFIRM_DEADLINE';
  }

  if (salesClosed && !reached) status = 'SALES_CLOSED';
  if (agencySlaExpired && !reached) status = 'AGENCY_SLA_EXPIRED';

  return {
    nowISO: now.toISOString(),
    confirmByISO: confirmBy.toISOString(),
    salesCloseAtISO: salesClose.toISOString(),
    agencyDeadlineISO: agencyDeadline.toISOString(),
    missing,
    reached,
    confirmExpired,
    salesClosed,
    agencySlaExpired,
    status,
  };
}

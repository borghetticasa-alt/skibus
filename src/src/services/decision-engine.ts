
import { createClient } from '@supabase/supabase-js';
import { enqueueNotification } from '../../netlify/functions/lib/notifications';

export enum BusRunStatus {
  DRAFT = 'draft',
  SOFT_HOLD = 'soft_hold',
  CONFIRMED = 'confirmed',
  LOCKED = 'locked',
  FULL = 'full',
  CANCELLED = 'cancelled'
}

export enum BusType {
  MIDIBUS = 'midibus',
  COACH = 'coach'
}

export interface DecisionResult {
  tripId: string;
  busEvaluations: BusEvaluation[];
  waitlistAnalysis: WaitlistAnalysis;
  activeAlerts: Alert[];
  slaStatus: 'GREEN' | 'YELLOW' | 'RED';
}

interface BusEvaluation {
  busRunId: string;
  type: BusType;
  status: BusRunStatus;
  capacity: number;
  seatsSold: number;
  pendingSeats: number;
  utilizationRate: number;
  isProfitable: boolean;
  breakEvenPoint: number;
  projectedProfit: number;
}

interface WaitlistAnalysis {
  totalRequested: number;
  recentVelocity: number;
  suggestedAction?: 'OPEN_MIDIBUS' | 'UPGRADE_COACH' | 'REMAIN_CLOSED';
}

interface Alert {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

const calculateBreakEven = (fixedCost: number, perBusCost: number, ticketPrice: number, commissionRate: number) => {
  const netPerTicket = ticketPrice * (1 - commissionRate);
  return Math.ceil((fixedCost + perBusCost) / netPerTicket);
};

/**
 * Commissione effettiva per calcoli soglia:
 * - se PayPal è abilitato "fino al minimo", prima del minimo usiamo la commissione più alta (approccio conservativo)
 */
function getEffectiveCommissionRate(trip: any, seatsSold: number): number {
  const stripeRate = Number(trip.commission_rate ?? 0);
  const paypalRate = Number(trip.paypal_commission_rate ?? 0);
  const disableAfter = Number(trip.paypal_disable_after_pax ?? 0); // 0 = mai disabilitare (non entra nei calcoli)

  // Se non abbiamo paypalRate, nulla da fare
  if (!Number.isFinite(paypalRate) || paypalRate <= 0) return stripeRate;

  // Se l'admin ha impostato una soglia "disabilita PayPal dopo X", prima di X consideriamo il peggiore
  if (Number.isFinite(disableAfter) && disableAfter > 0 && seatsSold < disableAfter) {
    return Math.max(stripeRate, paypalRate);
  }

  // Default: usiamo la commissione standard
  return stripeRate;
}

export async function evaluateTrip(tripId: string, isAdminAction: boolean = false): Promise<DecisionResult> {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Fetch dei dati con lock ottimistico (utilizzando i timestamp di aggiornamento se necessario)
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('*, bus_runs(*), bookings(*), seat_holds(*), waitlist_entries(*)')
    .eq('id', tripId)
    .single();

  if (tripErr || !trip) throw new Error(`Trip ${tripId} not found`);

  const activeAlerts: Alert[] = [];
  const busEvaluations: BusEvaluation[] = [];

  for (const bus of trip.bus_runs) {
    const seatsSold = trip.bookings
      .filter((b: any) => b.status === 'paid')
      .reduce((acc: number, b: any) => acc + b.seats, 0);

    const utilizationRate = (seatsSold / bus.capacity) * 100;
    const effectiveRate = getEffectiveCommissionRate(trip, seatsSold);
    const bep = calculateBreakEven(trip.fixed_cost, bus.cost, trip.base_price, effectiveRate);
    const isProfitable = seatsSold >= bep;

    busEvaluations.push({
      busRunId: bus.id,
      type: bus.bus_type,
      status: bus.status,
      capacity: bus.capacity,
      seatsSold,
      pendingSeats: 0,
      utilizationRate,
      isProfitable,
      breakEvenPoint: bep,
      projectedProfit: (seatsSold * trip.base_price * (1 - effectiveRate)) - (trip.fixed_cost + bus.cost)
    });

    // Alert: Bus quasi pieno (idempotente)
    if (utilizationRate >= 95) {
      const alertCode = 'BUS_FULL';
      const fingerprint = `${tripId}-${bus.id}-95pct`;
      activeAlerts.push({ code: alertCode, severity: 'warning', message: `Bus ${bus.id} al 95%+` });
      
      // Upsert alert e notifica atomica con chiave di idempotenza
      await supabase.from('notification_queue').upsert({
        trip_id: tripId,
        template_code: alertCode,
        payload: { busId: bus.id, utilization: utilizationRate },
        idempotency_key: fingerprint,
        status: 'queued'
      }, { onConflict: 'idempotency_key' });
    }

    // Alert: Rischio SLA (idempotente giornaliero)
    if (bus.status === BusRunStatus.SOFT_HOLD && !isProfitable) {
      const hoursToTrip = (new Date(trip.departure_date).getTime() - Date.now()) / (1000 * 3600);
      if (hoursToTrip < (trip.soft_hold_days_limit * 24)) {
        const today = new Date().toISOString().split('T')[0];
        const fingerprint = `SLA-RISK-${tripId}-${today}`;
        activeAlerts.push({ code: 'SLA_RISK', severity: 'critical', message: 'Rischio cancellazione soft hold' });
        
        await supabase.from('notification_queue').upsert({
          trip_id: tripId,
          template_code: 'SLA_RISK',
          payload: { tripTitle: trip.title, hours: Math.round(hoursToTrip) },
          idempotency_key: fingerprint,
          status: 'queued'
        }, { onConflict: 'idempotency_key' });
      }
    }
  }

  const waitlistCount = trip.waitlist_entries.length;
  let suggestedAction: WaitlistAnalysis['suggestedAction'] = 'REMAIN_CLOSED';

  if (waitlistCount >= trip.threshold_midibus && busEvaluations.length === 0) {
    suggestedAction = 'OPEN_MIDIBUS';
  } else if (waitlistCount >= trip.threshold_upgrade && busEvaluations.some(b => b.type === BusType.MIDIBUS)) {
    suggestedAction = 'UPGRADE_COACH';
  }

  let slaStatus: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  if (activeAlerts.some(a => a.severity === 'critical')) slaStatus = 'RED';
  else if (activeAlerts.some(a => a.severity === 'warning')) slaStatus = 'YELLOW';

  // Update condizionale dello stato del Trip per evitare sovrascritture se cambiato nel frattempo
  if (isAdminAction) {
    await supabase.from('trips').update({ 
      last_evaluated_at: new Date().toISOString() 
    }).eq('id', tripId);
    
    await supabase.from('audit_logs').insert({
      action: 'TRIP_EVALUATED',
      record_id: tripId,
      new_values: { slaStatus, alert_count: activeAlerts.length }
    });
  }

  return {
    tripId,
    busEvaluations,
    waitlistAnalysis: {
      totalRequested: waitlistCount,
      recentVelocity: 0,
      suggestedAction
    },
    activeAlerts,
    slaStatus
  };
}

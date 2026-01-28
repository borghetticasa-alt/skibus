
export type BusType = 'midibus' | 'coach';

export type BookingStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export interface TripConfig {
  threshold_midibus: number;
  threshold_coach: number;
  threshold_upgrade: number;
  soft_hold_days_limit: number;
  base_price: number;
  fixed_cost: number;
  commission_rate: number;
}

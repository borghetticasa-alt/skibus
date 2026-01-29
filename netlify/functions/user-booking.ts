
import { Handler } from '@netlify/functions';
import { authenticate, getSupabase } from './lib/auth';
import { checkRateLimit } from './lib/rate-limiter';
import { ErrorCode, respondError } from './lib/errors';
import { z } from 'zod';

const SeatHoldSchema = z.object({
  tripId: z.string().uuid(),
  busRunId: z.string().uuid(),
  seats: z.number().min(1).max(60)
});

export const handler: Handler = async (event) => {
  const { user } = await authenticate(event.headers.authorization);
  if (!user) return respondError(ErrorCode.UNAUTHORIZED, 401);

  const path = event.path.split('/').pop();

  if (path === 'create-seat-hold') {
    const isAllowed = await checkRateLimit(user.id, path, 5, 60);
    if (!isAllowed) return respondError(ErrorCode.RATE_LIMIT_EXCEEDED, 429);

    try {
      const parsed = SeatHoldSchema.safeParse(JSON.parse(event.body || '{}'));
      if (!parsed.success) return respondError(ErrorCode.INVALID_INPUT, 400);
      
      const body = parsed.data;
      const supabase = getSupabase();
      
      const { error } = await supabase.rpc('create_secure_seat_hold', {
        p_user_id: user.id,
        p_bus_run_id: body.busRunId,
        p_seats: body.seats
      });

      if (error) {
        if (error.message.includes('BUS_FULL')) return respondError(ErrorCode.BUS_FULL, 409);
        if (error.message.includes('SEATS_TAKEN')) return respondError(ErrorCode.SEATS_JUST_TAKEN, 409);
        throw error;
      }

      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }) 
      };
    } catch (e: any) {
      console.error("[Booking Error]", e);
      return respondError(ErrorCode.UNKNOWN_ERROR, 500);
    }
  }

  return { statusCode: 404, body: 'Not Found' };
};

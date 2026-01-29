
import { Handler } from '@netlify/functions';
import { authenticate, checkAdmin, getSupabase } from './lib/auth';
import { evaluateTrip } from '../../src/services/decision-engine';
import { z } from 'zod';

const TripSettingsSchema = z.object({
  tripId: z.string().uuid(),
  basePrice: z.number().positive(),
  fixedCost: z.number().nonnegative(),
  commissionRate: z.number().min(0).max(0.5),
  thresholds: z.object({
    midibus: z.number().int().positive(),
    upgrade: z.number().int().positive()
  }),
  adminNote: z.string().min(5, "Le note sono obbligatorie per tracciare le modifiche finanziarie")
});

const OverrideSchema = z.object({
  busRunId: z.string().uuid(),
  status: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  adminNote: z.string().min(5, "Note obbligatorie (min 5 caratteri)")
});

export const handler: Handler = async (event) => {
  const { user } = await authenticate(event.headers.authorization);
  if (!user || !(await checkAdmin(user.id))) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const supabase = getSupabase();
  const path = event.path.split('/').pop();
  const body = JSON.parse(event.body || '{}');

  try {
    if (path === 'admin-update-trip-settings') {
      const validated = TripSettingsSchema.parse(body);
      
      const { data: oldData } = await supabase.from('trips').select('*').eq('id', validated.tripId).single();
      
      const { error } = await supabase.from('trips')
        .update({
          base_price: validated.basePrice,
          fixed_cost: validated.fixedCost,
          commission_rate: validated.commissionRate,
          threshold_midibus: validated.thresholds.midibus,
          threshold_upgrade: validated.thresholds.upgrade
        })
        .eq('id', validated.tripId);

      if (error) throw error;

      const { error: logError } = await supabase.from('admin_audit_logs').insert({
        action: 'UPDATE_TRIP_ECONOMICS',
        trip_id: validated.tripId,
        admin_id: user.id,
        before_json: oldData,
        after_json: validated,
        admin_note: validated.adminNote,
        ip_address: event.headers['client-ip'] || event.headers['x-forwarded-for']
      });
      
      if (logError) console.error("Audit logging failed:", logError);

      return { statusCode: 200, body: JSON.stringify({ status: 'success' }) };
    }

    if (path === 'admin-force-override') {
      const validated = OverrideSchema.parse(body);
      
      const { data: oldBus } = await supabase.from('bus_runs').select('*, trip_id').eq('id', validated.busRunId).single();

      const updateData: any = {};
      if (validated.status) updateData.status = validated.status;
      if (validated.capacity) updateData.capacity = validated.capacity;

      const { error } = await supabase.from('bus_runs')
        .update(updateData)
        .eq('id', validated.busRunId);
      
      if (error) throw error;
    
      await supabase.from('admin_audit_logs').insert({
        action: 'BUS_OVERRIDE',
        trip_id: oldBus.trip_id,
        admin_id: user.id,
        before_json: oldBus,
        after_json: updateData,
        admin_note: validated.adminNote
      });

      return { statusCode: 200, body: JSON.stringify({ status: 'success' }) };
    }

    if (path === 'evaluate-trip') {
      const result = await evaluateTrip(body.tripId, true);
      return { statusCode: 200, body: JSON.stringify({ status: 'success', data: result }) };
    }

  } catch (e: any) {
    return { statusCode: 400, body: JSON.stringify({ status: 'error', error: e.message }) };
  }

  return { statusCode: 404, body: 'Not Found' };
};

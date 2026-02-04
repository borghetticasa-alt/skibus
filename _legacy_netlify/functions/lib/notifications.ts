
import { getSupabase } from './auth';
import { prepareNotificationRow } from '../../../shared/notification-logic';

export async function enqueueNotification(
  templateCode: string, 
  tripId: string, 
  payload: Record<string, any>, 
  userId?: string
) {
  const supabase = getSupabase();
  const row = prepareNotificationRow(templateCode, tripId, payload, userId);
  
  const { error } = await supabase.from('notification_queue').insert(row);
  if (error) throw new Error(`Failed to enqueue notification: ${error.message}`);
}

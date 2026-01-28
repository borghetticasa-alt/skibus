
import { getSupabase } from '../../netlify/functions/lib/auth';

/**
 * Renderizza un template string rimpiazzando i placeholder {{key}} con i valori nel payload
 */
export function renderTemplate(template: string, payload: Record<string, any>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const value = payload[key.trim()];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Inserisce una notifica in coda e (opzionalmente) la renderizza subito per log
 */
export async function enqueueNotification(
  templateCode: string, 
  tripId: string, 
  payload: Record<string, any>, 
  userId?: string
) {
  const supabase = getSupabase();

  // Inserimento nella coda
  const { error } = await supabase.from('notification_queue').insert({
    trip_id: tripId,
    user_id: userId || null,
    template_code: templateCode,
    payload: payload,
    status: 'queued'
  });

  if (error) throw new Error(`Failed to enqueue notification: ${error.message}`);
}

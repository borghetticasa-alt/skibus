
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
 * Helper per definire la struttura dati di inserimento in coda (senza dipendenza diretta da Supabase qui)
 */
export function prepareNotificationRow(templateCode: string, tripId: string, payload: Record<string, any>, userId?: string) {
  return {
    trip_id: tripId,
    user_id: userId || null,
    template_code: templateCode,
    payload: payload,
    status: 'queued'
  };
}

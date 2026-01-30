import { getSupabase } from "@lib/auth";

type NotificationPayload = {
  title: string;
  message: string;
  tripId?: string;
  userId?: string;
};

/**
 * Renderizza e salva una notifica nel database.
 * Usato lato server (API / cron / trigger).
 */
export async function renderNotification(payload: NotificationPayload) {
  const supabase = getSupabase();

  const { title, message, tripId, userId } = payload;

  if (!title || !message) {
    throw new Error("Notification requires title and message");
  }

  const { error } = await supabase.from("notifications").insert({
    title,
    message,
    trip_id: tripId ?? null,
    user_id: userId ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return { ok: true };
}

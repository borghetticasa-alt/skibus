
import { Config } from "@netlify/functions";
import { getSupabase } from "./lib/auth";
import { renderTemplate } from "../../shared/notification-logic";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Mappa dei template email
const EMAIL_TEMPLATES: Record<string, { subject: string, body: string }> = {
  'CONFIRMATION_TICKET': {
    subject: "Il tuo biglietto SkiBus: {{trip_title}}",
    body: "Ciao! Il tuo pagamento è stato confermato. Ecco il tuo biglietto per {{trip_title}} del {{departure_date}}. Visualizza qui: {{url}}/booking/{{booking_id}}"
  },
  'SLA_RISK': {
    subject: "Aggiornamento Viaggio: {{trip_title}}",
    body: "Attenzione, mancano solo {{hours}} ore alla conferma definitiva del bus. Invita i tuoi amici per garantire la partenza!"
  },
  'BUS_FULL': {
    subject: "Bus al completo!",
    body: "Ottime notizie: il bus {{bus_id}} per {{trip_title}} è ora al completo."
  }
};

export default async (req: Request) => {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY non configurata");
    return new Response("Missing API Key", { status: 500 });
  }

  const supabase = getSupabase();

  // 1. Preleva batch atomico
  const { data: batch, error: batchError } = await supabase.rpc('pick_notification_batch', {
    p_limit: 25 // Batch prudente per evitare timeout
  });

  if (batchError) {
    console.error("Errore prelievo batch:", batchError);
    return new Response("Batch error", { status: 500 });
  }

  if (!batch || batch.length === 0) {
    return new Response("No notifications to process");
  }

  const results = await Promise.all(batch.map(async (notif: any) => {
    const template = EMAIL_TEMPLATES[notif.template_code];
    if (!template) {
      await supabase.from('notification_queue').update({ 
        status: 'failed', 
        last_error: 'Template non trovato' 
      }).eq('id', notif.id);
      return { id: notif.id, status: 'error', reason: 'template_missing' };
    }

    // Recupera email utente se non presente nel payload
    let targetEmail = notif.payload.email;
    if (!targetEmail && notif.user_id) {
      const { data: user } = await supabase.auth.admin.getUserById(notif.user_id);
      targetEmail = user?.user?.email;
    }

    if (!targetEmail) {
      await supabase.from('notification_queue').update({ 
        status: 'failed', 
        last_error: 'Email destinatario mancante' 
      }).eq('id', notif.id);
      return { id: notif.id, status: 'error', reason: 'no_email' };
    }

    // Rendering
    const payload = { ...notif.payload, url: process.env.URL };
    const subject = renderTemplate(template.subject, payload);
    const htmlBody = renderTemplate(template.body, payload);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SkiBus <biglietti@skibus.it>',
          to: [targetEmail],
          subject,
          html: htmlBody
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Resend API error');
      }

      await supabase.from('notification_queue').update({ 
        status: 'sent', 
        sent_at: new Date().toISOString() 
      }).eq('id', notif.id);

      return { id: notif.id, status: 'sent' };
    } catch (err: any) {
      await supabase.from('notification_queue').update({ 
        status: 'failed', 
        last_error: err.message 
      }).eq('id', notif.id);
      return { id: notif.id, status: 'failed', error: err.message };
    }
  }));

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
};

export const config: Config = {
  schedule: "*/2 * * * *" // Ogni 2 minuti
};

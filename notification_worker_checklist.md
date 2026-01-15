
# Notification Worker Setup Checklist

### 1. Resend Setup
- Crea account su [resend.com](https://resend.com).
- Verifica il dominio (es. `skibus.it`) o usa `onboarding@resend.dev` per i test.
- Genera una API Key.

### 2. Netlify Configuration
- Aggiungi `RESEND_API_KEY` nelle environment variables.
- Assicurati che `URL` sia impostato correttamente per i link nei biglietti.

### 3. Database Updates
- Esegui le migrazioni in `schema.sql` per aggiungere le colonne di stato e la RPC `pick_notification_batch`.

### 4. Monitoring
- Controlla i log di Netlify per la funzione `send-notifications`.
- In SQL, usa questa query per monitorare la coda:
  ```sql
  SELECT status, count(*) FROM notification_queue GROUP BY status;
  ```
- Per vedere gli errori:
  ```sql
  SELECT template_code, last_error FROM notification_queue WHERE status = 'failed';
  ```

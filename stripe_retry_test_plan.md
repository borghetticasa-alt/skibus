
# Stripe Webhook Retry Test Plan

Obiettivo: Verificare che l'esecuzione multipla dello stesso evento non causi overbooking o errori logici.

### Test Case: Tripla Notifica Identica
1. **Trigger**: Invia una richiesta POST a `/.netlify/functions/stripe-webhook` con un payload `checkout.session.completed` valido e una signature corretta.
2. **Prima Chiamata (Esecuzione)**:
   - Verifica: `bookings` diventa `paid`.
   - Verifica: `bus_runs.seats_occupied` incrementa.
   - Verifica: `processed_stripe_events` contiene l'`event_id`.
   - Risposta attesa: `200 OK`.
3. **Seconda Chiamata (Retry Immediato)**:
   - Simula un retry di Stripe inviando lo *stesso* `event_id`.
   - Verifica: Il database NON deve subire modifiche (no doppio incremento posti).
   - Risposta attesa: `200 OK` (con status `already_processed` nei log interni).
4. **Terza Chiamata (Post-Cold Start)**:
   - Invia di nuovo lo stesso evento dopo 5 minuti.
   - Verifica: Il sistema deve riconoscere l'idempotenza anche dopo il riavvio della funzione.
   - Risposta attesa: `200 OK`.

### Simulazione Errore di Rete
1. Modifica temporaneamente la RPC per lanciare un errore.
2. Invia l'evento. La funzione deve rispondere `500`.
3. Ripristina la RPC.
4. Invia l'evento. La funzione deve rispondere `200` e processare il booking correttamente.

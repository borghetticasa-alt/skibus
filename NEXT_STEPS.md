# Ski Bus — Piano operativo consigliato

Questa è la sequenza consigliata per chiudere il progetto senza blocchi.

## 0) Sbloccare build/deploy (subito)

1. Installare dipendenza PayPal UI:
   ```bash
   npm i @paypal/react-paypal-js
   ```
2. Ripristinare il widget PayPal in checkout (ora è messo in fallback testuale per evitare build rotte).
3. Verificare build:
   ```bash
   npm run build
   ```

## 1) Priorità prodotto (MVP reale)

1. **Numeri + capienza + costi su DB** (niente solo localStorage)
   - endpoint admin numeri stabile
   - persistenza bus/costi/servizi
2. **Checkout robusto**
   - creazione prenotazione
   - partecipanti multipli
   - hold posti con scadenza
3. **Pagamenti end-to-end**
   - Stripe checkout + webhook idempotente
   - PayPal create/capture senza step manuali

## 2) Sicurezza e ruoli

1. RLS su tutte le tabelle public.
2. `user_roles` + gate admin su route `/api/admin/*`.
3. Nessuna chiave server esposta lato client.

## 3) Go-live checklist

1. Variabili ambiente complete su Vercel.
2. Test sandbox (Stripe/PayPal) con casi di errore.
3. Smoke test finale: home, trips, checkout, account, admin.

## Definizione di “finito” (pratica)

- Build verde.
- Flusso prenotazione completo da utente anonimo fino a pagamento/callback.
- Dashboard admin aggiorna numeri e stato gita senza patch manuali SQL.
- Monitoraggio minimo errori API in produzione.

# SKI BUS

Applicazione web per la gestione delle gite sciistiche: configurazione viaggi, calcolo margini/costi (Numbers), prenotazioni e integrazione pagamenti.

## Stack tecnico

- Next.js + React
- Supabase (DB/Auth/Storage)
- Stripe e PayPal (flussi pagamento)

## Avvio in locale

**Prerequisiti:** Node.js 20+

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Crea un file `.env.local` partendo da `.env.example` e configura le variabili necessarie.
3. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```
4. Apri `http://localhost:3000`.

## Variabili ambiente principali

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server)
- `PAYPAL_*` / `STRIPE_*` (solo server)

Per il setup completo di deploy e pagamenti, vedi:

- `README_DEPLOY.md`
- `PROJECT_CHECKLIST.md`
- `stripe_production_checklist.md`
- `NEXT_STEPS.md` (ordine pratico dei lavori consigliato)

## Stato progetto

La checklist operativa per portare il progetto in produzione è in `PROJECT_CHECKLIST.md`.
In particolare, è già presente una modalità test locale per Numbers (localStorage), utile per validare i calcoli senza toccare il DB.

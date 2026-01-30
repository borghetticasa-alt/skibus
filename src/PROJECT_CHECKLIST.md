# SKI BUS — Checklist per “finito” + modalità test

Questa build include **modalità test locale** (usa localStorage per Numbers) e UI aggiornata.
Sotto trovi cosa manca per considerare il progetto “finito” lato produzione.

## 1) Dati e DB (Supabase) — fondamentale
- [ ] Tabelle definitive:
  - [ ] trips (gite)
  - [ ] bus_runs oppure buses (mezzi/capienze/costi)
  - [ ] bookings (prenotazioni)
  - [ ] booking_attendees (uno per partecipante: nome/cognome/email/cell)
  - [ ] trip_services (servizi visibili: vendita+costo+tipo)
  - [ ] trip_internal_costs (costi interni: solo costo)
- [ ] RLS attivo su tutte le tabelle public esposte a PostgREST
- [ ] Policy minime:
  - [ ] INSERT booking consentito ad anon (solo per la singola prenotazione)
  - [ ] SELECT booking negato ad anon (o solo own booking con auth)
  - [ ] UPDATE/DELETE solo service role (server)
  - [ ] trips: SELECT pubblico (solo campi necessari), UPDATE solo admin
- [ ] Storage bucket per media (skirama) + policy upload solo admin

## 2) Admin — funzionalità
- [ ] “Crea nuova gita” deve salvare davvero su DB e riapparire in lista
- [ ] Numbers deve salvare su DB:
  - [ ] bus selezionato, capienza, costo bus
  - [ ] prezzo base vendita/costo
  - [ ] servizi e costi interni
  - [ ] fee pagamenti (paypal/stripe)
- [ ] Template gite: duplicazione rapida (opzionale ma utile)

## 3) Checkout cliente
- [ ] Prezzo base + servizi selezionabili (per prenotazione / per persona / opzioni)
- [ ] Salvataggio dettagli partecipanti (anche se prenota per 10+)
- [ ] Blocco posti (seat hold) prima del pagamento, con scadenza
- [ ] Gestione rimborso secondo regola “fino a conferma bus”

## 4) Pagamenti
- [ ] PayPal sandbox ok in locale
- [ ] Stripe checkout + webhook su Vercel
- [ ] Idempotenza webhook (no doppi addebiti)
- [ ] Refund flow admin

## 5) Auth / Ruoli
- [ ] Login OTP funzionante + redirect `/auth/callback`
- [ ] Tabella `user_roles` (admin) + verifica nelle API
- [ ] Redirect URLs impostati in Supabase (local + vercel)

## 6) Deploy (Vercel)
- [ ] Environment variables su Vercel:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY (solo server)
  - [ ] PAYPAL_* e STRIPE_* (server)
- [ ] Routes API: devono essere `/api/...` (no netlify functions)

## 7) Modalità test (già presente in Numbers)
- Numbers salva localmente su browser (localStorage)
- Serve per provare conti e bus senza toccare DB


## Aggiornamento v12 — salvataggio Numbers su Supabase
- [ ] Esegui `schema_numbers.sql` su Supabase (SQL Editor) per creare:
  - buses
  - trip_numbers
  - trip_services
  - trip_internal_costs
- [ ] Metti su Vercel le env server:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - SUPABASE_SERVICE_ROLE_KEY (server-only)
- [ ] In UI Numbers: disattiva “Modalità Test” e usa **Salva su Supabase**.

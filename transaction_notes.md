
# Critical Transactions & Overbooking Prevention

Per garantire la coerenza ed evitare l'overbooking in un ambiente ad alta concorrenza (es. apertura vendite mattutina), le seguenti operazioni devono essere atomiche:

### 1. Seat Hold (Temporary Lock)
Quando un utente seleziona i posti, viene creato un `seat_hold`. 
- **Query**: `SELECT SUM(seats_occupied) + (SELECT COALESCE(SUM(seats), 0) FROM seat_holds WHERE bus_run_id = $1 AND expires_at > NOW())`
- **Logic**: Se il totale + nuovi posti > `capacity`, restituisci errore "Sold Out".
- **Isolation**: Usare livello `SERIALIZABLE` o `SELECT FOR UPDATE` sulla riga di `bus_runs` per bloccare la concorrenza durante il check.

### 2. Booking Confirmation (Payment Success)
Al momento del pagamento riuscito (webhook Stripe):
- **Transaction**:
    1. Update `bookings` status to `paid`.
    2. Increment `bus_runs.seats_occupied`.
    3. Delete related `seat_holds`.
    4. If `seats_occupied == capacity`, update `bus_runs.status` to `full`.
    5. Log action in `audit_logs`.

### 3. Automatic Expiry
Un worker (o Edge Function cron) deve eseguire periodicamente:
- **Query**: `UPDATE bookings SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW()`.
- **Logic**: Liberare i posti nel `bus_run` se la prenotazione scade.

### 4. Waitlist Promotion
Quando un `booking` viene cancellato e i posti si liberano:
- **Transaction**:
    1. Verifica la prima `waitlist_entries` per il `trip_id`.
    2. Inserisci in `notification_queue` un invito con priorità.
    3. Crea un `seat_hold` riservato per quell'utente (opzionale).

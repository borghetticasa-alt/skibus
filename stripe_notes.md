
# Stripe + Netlify Integration Notes

### Environment Variables
Necessarie su Netlify UI (Site Settings > Build & Deploy > Environment):
- `STRIPE_SECRET_KEY`: Chiave segreta (sk_test_...)
- `STRIPE_WEBHOOK_SECRET`: Ottenuta dopo aver configurato l'endpoint webhook nella dashboard Stripe (whsec_...).
- `URL`: L'URL base del sito (es. https://tuo-sito.netlify.app) per i redirect di successo/cancellazione.

### Webhook Configuration
L'endpoint webhook deve puntare a:
`https://<vostro-sito>.netlify.app/.netlify/functions/stripe-webhook`

### Database RPC
Assicurati di creare la funzione `confirm_booking_payment` in Postgres per gestire l'atomicità:
```sql
CREATE OR REPLACE FUNCTION confirm_booking_payment(
  p_booking_id UUID,
  p_stripe_session_id TEXT,
  p_payment_intent_id TEXT,
  p_amount INTEGER
) RETURNS void AS $$
DECLARE
  v_bus_run_id UUID;
  v_seats INTEGER;
BEGIN
  -- Verifica se il pagamento è già stato registrato (idempotenza)
  IF EXISTS (SELECT 1 FROM payments WHERE stripe_session_id = p_stripe_session_id) THEN
    RETURN;
  END IF;

  -- 1. Recupera info booking
  SELECT bus_run_id, seats INTO v_bus_run_id, v_seats FROM bookings WHERE id = p_booking_id;

  -- 2. Update Booking Status
  UPDATE bookings SET status = 'paid' WHERE id = p_booking_id;

  -- 3. Increment Seats Occupied
  UPDATE bus_runs SET seats_occupied = seats_occupied + v_seats WHERE id = v_bus_run_id;

  -- 4. Delete related seat holds
  DELETE FROM seat_holds WHERE bus_run_id = v_bus_run_id AND expires_at > NOW(); -- Più sicuro filtrare per user se possibile

  -- 5. Record Payment
  INSERT INTO payments (booking_id, stripe_session_id, stripe_payment_intent_id, amount_total, status)
  VALUES (p_booking_id, p_stripe_session_id, p_payment_intent_id, p_amount, 'paid');
END;
$$ LANGUAGE plpgsql;
```

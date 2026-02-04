
# Stripe Go-Live Checklist

### 1. Netlify Environment Separation
Configura le variabili in **Site Settings > Environment Variables** usando gli scopi (Scopes/Values by Context):

| Variabile | Valore Live (Production) | Valore Test (Deploy Previews) |
|:---|:---|:---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_...` | `whsec_test_...` |
| `APP_ENV` | `production` | `development` |
| `URL` | `https://www.skibus.it` | `https://preview--skibus.netlify.app` |

### 2. Stripe Dashboard (Live Mode)
- **Webhook Endpoint**: Crea un nuovo endpoint che punta a `https://www.skibus.it/.netlify/functions/stripe-webhook`.
- **Events**: Seleziona solo `checkout.session.completed`.
- **Signing Secret**: Copia la chiave `whsec_...` e incollala su Netlify (Production context).

### 3. Redirect URLs
Assicurati che `success_url` e `cancel_url` usino la variabile `process.env.URL` per evitare che un utente in produzione finisca su un URL di test.

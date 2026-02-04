# Deploy su Netlify (SKI BUS)

## 1) Carica su GitHub
1. Estrai questo zip in una cartella.
2. Apri PowerShell nella cartella del progetto (dove vedi `package.json`).
3. Esegui:

```powershell
git init
git add .
git commit -m "Netlify-ready"
git branch -M main
git remote add origin https://github.com/<TUOUSERNAME>/<REPO>.git
git push -u origin main
```

## 2) Collega su Netlify
Netlify Dashboard → Add new site → Import from Git → GitHub → scegli il repo.

Build settings (se richiesto):
- Build command: `npm run build`
- Plugin Next: già configurato in `netlify.toml`

## 3) Environment Variables (OBBLIGATORIE)
Netlify → Site settings → Build & deploy → Environment → Environment variables.

Inserisci (valori presi dal tuo Supabase/PayPal/Stripe):

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### PayPal
- `PAYPAL_MODE` (sandbox | live)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

### Stripe (se usi Stripe)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## 4) Deploy
Fai “Deploy site”.  
Se il deploy fallisce, apri Deploy log e copia/incolla qui le ultime righe dell'errore.

## Nota sicurezza
- NON committare `.env.local`.
- Le chiavi segrete vanno solo in Netlify Environment Variables.

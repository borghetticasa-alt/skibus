
# Netlify Environment Checklist (Pooling & DB)

### 1. Database Pooler (Supabase)
- Vai su **Supabase Dashboard > Settings > Database**.
- In **Connection string**, seleziona **Transaction mode**.
- Assicurati che l'host includa `.pooler.supabase.com` e la porta sia `6543`.
- Assicurati che `?pgbouncer=true` sia presente alla fine della stringa se usi Prisma o driver simili.

### 2. Netlify Environment Variables (UI)
| Variabile | Valore | Scope |
|:---|:---|:---|
| `DATABASE_URL` | Stringa con porta 6543 | Tutte (Prod/Preview) |
| `SUPABASE_URL` | https://... | Tutte |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key | Solo Production / Secret |
| `SUPABASE_ANON_KEY` | Public key | Tutte |

### 3. Best Practices Severless
- **No Global Connections**: Non istanziare nuovi client `new Client()` dentro gli handler. Usa il singleton in `src/lib/supabase/db.ts`.
- **Port 6543**: Mai usare la porta `5432` su Netlify Functions; esauriresti i processi Postgres in pochi minuti.
- **Max Connections**: Su Supabase (piano Free), il limite è spesso 200. Il pooler gestisce migliaia di connessioni virtuali mappandole su quelle fisiche.

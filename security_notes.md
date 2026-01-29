
# Strategia di Sicurezza: Defense in Depth

L'architettura SkiBus implementa tre livelli di protezione per le aree amministrative:

### Livello 1: Edge Validation (Middleware)
Il middleware Next.js verifica i **Custom Claims** nel JWT. 
- **Pro**: Latenza minima, blocco immediato della UI.
- **Contro**: Se il ruolo cambia nel DB, il JWT dell'utente rimane valido fino alla scadenza (solitamente 1 ora).

### Livello 2: Server-side Verification (Netlify Functions)
Tutte le funzioni `admin-*.ts` utilizzano `checkAdmin(user.id)`.
- **Dettaglio**: Questa funzione interroga direttamente la tabella `user_roles` nel database.
- **Sicurezza**: Anche se un utente riuscisse a manipolare il proprio JWT o se il claim fosse datato, la query DB bloccherà l'azione se il permesso è stato revocato.

### Livello 3: Database Policy (RLS)
Le tabelle sensibili (audit logs, settings finanziari) hanno Row Level Security attiva.
- **Vincolo**: Solo le chiamate effettuate con la `SERVICE_ROLE_KEY` (usata dalle funzioni admin) o token con claim `admin` possono interagire con queste tabelle.

### Raccomandazione: Refresh Token
In caso di revoca di un ruolo admin, è consigliabile chiamare `supabase.auth.admin.updateUserById(id, { user_metadata: { force_logout: true } })` o attendere la naturale scadenza del JWT per invalidare i claims lato client.

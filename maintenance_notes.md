
# Gestione Immutabilità Audit Logs

Per garantire la conformità finanziaria e la tracciabilità assoluta, le tabelle `audit_logs` e `admin_audit_logs` sono state rese **Append-Only**.

## Restrizioni Attive
1. **Trigger Postgres**: Ogni tentativo di `UPDATE` o `DELETE` solleva un'eccezione SQL, interrompendo la transazione.
2. **Permissions**: I ruoli `authenticated` e `anon` non hanno permessi di scrittura se non tramite `INSERT`.

## Come gestire migrazioni o manutenzione
Se in futuro fosse strettamente necessario modificare la struttura o ripulire log molto vecchi (es. GDPR dopo 10 anni):

### Procedura di Sblocco Temporaneo (Solo Superuser/DBA)
1. Disabilitare temporaneamente il trigger:
   ```sql
   ALTER TABLE audit_logs DISABLE TRIGGER tr_audit_logs_immutability;
   ```
2. Eseguire la manutenzione necessaria.
3. Riabilitare immediatamente il trigger:
   ```sql
   ALTER TABLE audit_logs ENABLE TRIGGER tr_audit_logs_immutability;
   ```

### Archiviazione
Per mantenere il database performante, si consiglia di spostare i log vecchi in un "Cold Storage" (es. S3 o una tabella di archivio separata) tramite un processo che legga i dati e poi utilizzi lo sblocco temporaneo descritto sopra per rimuoverli dalla tabella operativa.

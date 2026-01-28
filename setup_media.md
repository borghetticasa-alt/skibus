# Setup Skirama + Meteo (Supabase)

## 1) Crea bucket Storage
- Supabase Dashboard → Storage → New bucket
- Nome: `skirama`
- Public bucket: ✅ (consigliato per mostrare immagini senza signed URL)

## 2) Policy upload (semplice)
Se vuoi permettere upload solo ad utenti autenticati:

In Storage → Policies per bucket `skirama`, crea policy **INSERT/UPDATE** per authenticated.
In alternativa, per sviluppo, puoi lasciare permissivo e poi chiudere.

## 3) Tabella trip_media
Esegui `schema_trip_media.sql` nel SQL Editor.

## 4) Uso
- Admin carica uno skirama per ogni gita (tripId) e salva anche `weather_query` (es. "Champoluc", "Gressoney", "Alagna").
- Checkout mostra skirama + previsioni 5 giorni (Open-Meteo).

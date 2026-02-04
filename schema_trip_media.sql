-- Media per singola gita: skirama + query meteo
-- Esegui su Supabase SQL Editor

create table if not exists public.trip_media (
  trip_id text primary key,
  skirama_url text,
  weather_query text,
  updated_at timestamptz not null default now()
);

alter table public.trip_media enable row level security;

-- Lettura pubblica (solo url e query, niente dati personali)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='trip_media' and policyname='trip_media_public_read'
  ) then
    create policy trip_media_public_read on public.trip_media
      for select
      using (true);
  end if;
end $$;

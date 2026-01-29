-- Booking attendees (per ogni partecipante: Nome/Cognome/Email/Cellulare)
-- Esegui su Supabase (SQL Editor). Le Netlify Functions usano service role e possono scrivere anche con RLS.
create table if not exists public.booking_attendees (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  idx int not null check (idx >= 1),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists booking_attendees_unique on public.booking_attendees(booking_id, idx);

-- RLS (lettura/scrittura controllata via policies; service role bypassa comunque)
alter table public.booking_attendees enable row level security;

-- Permetti al proprietario della booking di leggere i propri partecipanti
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='booking_attendees' and policyname='read_own_attendees'
  ) then
    create policy read_own_attendees on public.booking_attendees
      for select
      using (
        exists (
          select 1 from public.bookings b
          where b.id = booking_attendees.booking_id
            and b.user_id = auth.uid()
        )
      );
  end if;
end $$;

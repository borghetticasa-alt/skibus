-- Trip Numbers (conti per gita) + servizi + costi interni + bus
-- Esegui su Supabase (SQL Editor). Le API server (service role) bypassano RLS.

-- BUS catalog (semplice: puoi estenderlo quando vuoi)
create table if not exists public.buses (
  id text primary key,
  label text not null,
  capacity int not null check (capacity > 0),
  default_cost_total numeric not null default 0,
  created_at timestamptz not null default now()
);

insert into public.buses (id, label, capacity, default_cost_total)
values
  ('small', 'Bus Piccolo', 34, 0),
  ('medium', 'Bus Medio', 49, 0),
  ('large', 'Bus Grande', 59, 0)
on conflict (id) do nothing;

alter table public.buses enable row level security;

-- Trip Numbers (1 riga per trip)
create table if not exists public.trip_numbers (
  trip_id text primary key references public.trips(id) on delete cascade,
  bus_id text references public.buses(id),
  capacity int not null default 0,
  bus_cost_total numeric not null default 0,

  base_sale_price numeric not null default 0,  -- prezzo base vendita (per persona)
  base_cost_price numeric not null default 0,  -- costo base (per persona)

  paypal_fee_percent numeric not null default 0,
  paypal_fee_fixed numeric not null default 0,
  stripe_fee_percent numeric not null default 0,
  stripe_fee_fixed numeric not null default 0,

  updated_at timestamptz not null default now()
);

alter table public.trip_numbers enable row level security;

-- Servizi visibili lato cliente (extra)
create table if not exists public.trip_services (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  name text not null,
  pricing_mode text not null default 'per_person', -- per_person | per_booking | quantity | options
  sale_price numeric not null default 0,
  cost_price numeric not null default 0,
  options jsonb,
  is_active boolean not null default true,
  sort int not null default 100,
  created_at timestamptz not null default now()
);

alter table public.trip_services enable row level security;

-- Costi interni (solo admin)
create table if not exists public.trip_internal_costs (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  name text not null,
  cost_mode text not null default 'fixed', -- fixed | per_person
  amount numeric not null default 0,
  is_active boolean not null default true,
  sort int not null default 100,
  created_at timestamptz not null default now()
);

alter table public.trip_internal_costs enable row level security;

-- Nota RLS:
-- Lasciamo ZERO policy pubbliche qui: letture/scritture avvengono via API server con service role.

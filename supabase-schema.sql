-- ============================================================
-- V-KOOL BOOKING — SUPABASE DATABASE SCHEMA
-- Run this entire file in:
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ---- BOOKINGS TABLE ----
create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  booking_code        text unique not null,
  status              text not null default 'pending'
                        check (status in ('pending','paid','completed','cancelled')),

  -- Customer
  name                text not null,
  email               text not null,
  phone               text not null,

  -- Vehicle
  make                text not null,
  model               text not null,
  year                text,
  vehicle_type        text not null,

  -- Service
  tint_type           text not null,

  -- Appointment
  date                date not null,
  hour                int  not null check (hour between 8 and 16),
  location_id         text not null default 'san-salvador',

  -- Pricing
  regular_price       numeric(8,2) not null,
  web_price           numeric(8,2) not null,
  final_price         numeric(8,2) not null,
  coupon_code         text,
  coupon_discount     numeric(8,2) default 0,

  -- Payment
  wompi_transaction_id text,

  -- Timestamps
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Auto-update updated_at on every row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();

-- ---- COUPONS TABLE ----
create table if not exists coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  type          text not null check (type in ('percentage', 'flat')),
  value         numeric(8,2) not null,  -- % or $ amount
  active        boolean default true,
  expires_at    timestamptz,
  usage_limit   int,                    -- null = unlimited
  usage_count   int default 0,
  created_at    timestamptz default now()
);

-- Function to safely increment coupon usage (called from webhook)
create or replace function increment_coupon_usage(coupon_code text)
returns void as $$
begin
  update coupons
  set usage_count = usage_count + 1
  where code = coupon_code;
end;
$$ language plpgsql;

-- ---- SEED: Initial coupon codes ----
insert into coupons (code, type, value, active, usage_limit)
values
  ('WEB10',    'percentage', 10,  true, null),   -- 10% off — permanent web discount
  ('PASCUA25', 'percentage', 25,  false, 500),   -- 25% off — Easter (activate when needed)
  ('NAVIDAD20','percentage', 20,  false, 500),   -- 20% off — Christmas
  ('VIERNES10','flat',       10,  false, 200),   -- $10 off — Black Friday
  ('PROMO15',  'flat',       15,  false, 100)    -- $15 off — general promo
on conflict (code) do nothing;

-- ---- ROW LEVEL SECURITY ----
-- Bookings are only readable/writable via the service role key (server-side).
-- The anon key (browser) cannot read booking data directly.
alter table bookings enable row level security;
alter table coupons  enable row level security;

-- Service role bypasses RLS automatically — no policy needed for server-side.
-- If you later build an admin dashboard, add policies here.

-- ---- INDEXES for performance ----
create index if not exists bookings_booking_code_idx on bookings(booking_code);
create index if not exists bookings_date_hour_idx    on bookings(date, hour);
create index if not exists bookings_email_idx        on bookings(email);
create index if not exists bookings_status_idx       on bookings(status);
create index if not exists coupons_code_idx          on coupons(code);

-- ---- DONE ----
-- Verify with:
-- select * from bookings limit 5;
-- select * from coupons;

-- ══════════════════════════════════════════════════════════════════
--  Sole & Stone — Supabase schema
--  Run this in Supabase → SQL Editor (or `supabase db push`).
--  Idempotent: safe to re-run.
-- ══════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Profiles ──────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  address    text,
  city       text,
  postal_code text,
  country    text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Existing projects: `create table if not exists` won't add new columns.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists country text;

-- Auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS for profiles — users can read/update only their own row
alter table public.profiles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users read own profile') then
    create policy "Users read own profile" on public.profiles for select
      using (auth.uid() = id);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users update own profile') then
    create policy "Users update own profile" on public.profiles for update
      using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins manage profiles') then
    create policy "Admins manage profiles" on public.profiles for all
      using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
-- Helper: current user is admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ── Site settings ─────────────────────────────────────────────────
-- Single public row edited from the admin "Storefront" tab. Missing or
-- partial values fall back to the app defaults in lib/site-settings.ts.
create table if not exists public.site_settings (
  id           text primary key default 'default',
  company_name text not null default 'Sole & Stone',
  hero         jsonb not null default '{}'::jsonb,
  banner       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table public.site_settings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Site settings are public') then
    create policy "Site settings are public" on public.site_settings for select using (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins manage site settings') then
    create policy "Admins manage site settings" on public.site_settings for all
      using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

insert into public.site_settings (id) values ('default') on conflict (id) do nothing;

-- ── Products ──────────────────────────────────────────────────────
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  brand            text not null,
  category         text not null check (category in
                       ('sneakers','running','basketball','boots','dress','heels')),
  gender           text not null default 'unisex' check (gender in ('men','women','unisex')),
  color            text,
  color_family     text,
  price            numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2),
  images           text[] not null default '{}',
  sizes            jsonb not null default '[]',        -- [{size: "US 9", stock: 4}]
  rating           numeric(3,2) not null default 0,
  review_count     integer not null default 0,
  tags             text[] not null default '{}',
  short_description text,
  description      text,
  details          text[] not null default '{}',
  care             text,
  created_at       timestamptz not null default now()
);

alter table public.products enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Products are public') then
    create policy "Products are public" on public.products for select using (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins manage products') then
    create policy "Admins manage products" on public.products for all
      using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- ── Orders ────────────────────────────────────────────────────────
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  status     text not null default 'pending' check (status in
               ('pending','processing','shipped','delivered','cancelled')),
  customer   jsonb not null default '{}',              -- name, email, address…
  items      jsonb not null default '[]',              -- CartLine[]
  subtotal   numeric(10,2) not null default 0,
  shipping   numeric(10,2) not null default 0,
  total      numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users read own orders') then
    create policy "Users read own orders" on public.orders for select
      using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Anyone creates an order') then
    create policy "Anyone creates an order" on public.orders for insert
      with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users claim own orders') then
    -- Lets a signed-in user stamp their user_id onto a guest order they placed
    -- (user_id was null at insert time). The check prevents claiming others' rows.
    create policy "Users claim own orders" on public.orders for update
      using (user_id is null)
      with check (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins manage orders') then
    create policy "Admins manage orders" on public.orders for all
      using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- ── Reviews ───────────────────────────────────────────────────────
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  author     text,
  rating     integer not null check (rating between 1 and 5),
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Reviews are readable') then
    create policy "Reviews are readable" on public.reviews for select using (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users write own reviews') then
    create policy "Users write own reviews" on public.reviews for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ── Wishlist ──────────────────────────────────────────────────────
create table if not exists public.wishlist (
  user_id    uuid references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.wishlist enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Wishlist is per-user') then
    create policy "Wishlist is per-user" on public.wishlist for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ── Indexes ───────────────────────────────────────────────────────
create index if not exists orders_user_idx      on public.orders (user_id);
create index if not exists orders_created_idx   on public.orders (created_at desc);
create index if not exists reviews_product_idx  on public.reviews (product_id);
create index if not exists products_brand_idx   on public.products (brand);
create index if not exists products_cat_idx     on public.products (category);

-- ── PostgREST ─────────────────────────────────────────────────────
-- Make new tables/columns visible to the REST API immediately.
notify pgrst, 'reload schema';

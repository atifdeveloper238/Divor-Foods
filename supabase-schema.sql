-- ============================================================
-- HOMEMADE FOOD ORDERING SYSTEM — SUPABASE SCHEMA
-- Run this whole file once in Supabase SQL Editor
-- (Project -> SQL Editor -> New query -> paste -> Run)
-- ============================================================

-- 0. EXTENSIONS ---------------------------------------------------
create extension if not exists pgcrypto;

-- 0b. CUSTOMERS (real accounts, not just browser storage) ----------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  password_hash text not null,
  name text not null,
  location text not null,
  created_at timestamptz not null default now()
);

alter table customers enable row level security;
-- No direct table access for anon/authenticated at all — customers are
-- only ever created/read through the two RPC functions below, which run
-- as the table owner and never expose password_hash to the browser.
-- Exception: the logged-in admin needs to see customer names in the chat
-- tab, so authenticated (admin) gets read access; anon still has none.
create policy "admin read customers" on customers for select
  using (auth.role() = 'authenticated');

create or replace function customer_signup(p_phone text, p_password text, p_name text, p_location text)
returns table(id uuid, name text, phone text, location text)
language plpgsql
security definer
as $$
begin
  if exists (select 1 from customers where phone = p_phone) then
    raise exception 'An account with this phone number already exists.';
  end if;
  return query
    insert into customers (phone, password_hash, name, location)
    values (p_phone, crypt(p_password, gen_salt('bf')), p_name, p_location)
    returning customers.id, customers.name, customers.phone, customers.location;
end;
$$;

create or replace function customer_login(p_phone text, p_password text)
returns table(id uuid, name text, phone text, location text)
language plpgsql
security definer
as $$
begin
  return query
    select customers.id, customers.name, customers.phone, customers.location
    from customers
    where customers.phone = p_phone
      and customers.password_hash = crypt(p_password, customers.password_hash);
end;
$$;

create or replace function customer_get(p_id uuid)
returns table(id uuid, name text, phone text, location text)
language sql
security definer
as $$
  select customers.id, customers.name, customers.phone, customers.location
  from customers where customers.id = p_id;
$$;

-- Anyone can call these three functions (they're the only door into
-- the customers table); grant execute to the anon role explicitly.
grant execute on function customer_signup(text, text, text, text) to anon;
grant execute on function customer_login(text, text) to anon;
grant execute on function customer_get(uuid) to anon;


create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  photo_url text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. SETTINGS (single row, key/value-ish table of site config) -
create table if not exists settings (
  id int primary key default 1,
  ordering_enabled boolean not null default true,
  kitchen_name text not null default 'Home Kitchen',
  kitchen_phone text not null default '',
  kitchen_location text not null default '',
  kitchen_description text not null default '',
  easypaisa_account_name text not null default '',
  easypaisa_account_number text not null default '',
  delivery_charge numeric(10,2) not null default 0,
  next_order_id int not null default 1,
  constraint single_row check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- 3. ORDERS -------------------------------------------------------
create table if not exists orders (
  id int primary key,                 -- human-friendly sequential order id (resettable)
  customer_id uuid references customers(id),
  customer_name text not null,
  customer_phone text not null,
  customer_location text not null,
  items jsonb not null,               -- [{name, price, qty}]
  delivery_charge numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text not null default 'easypaisa',
  payment_screenshot_url text,
  status text not null default 'pending',   -- pending | confirmed | preparing | out_for_delivery | delivered | cancelled
  rider_name text,
  rider_phone text,
  created_at timestamptz not null default now()
);

-- 4. CHAT MESSAGES --------------------------------------------------
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  sender text not null,               -- 'customer' | 'admin'
  message text not null,
  created_at timestamptz not null default now()
);

-- 5. RPC: get next order id AND increment counter atomically ------
create or replace function get_next_order_id()
returns int
language plpgsql
as $$
declare
  next_id int;
begin
  update settings set next_order_id = next_order_id + 1
    where id = 1
    returning next_order_id - 1 into next_id;
  return next_id;
end;
$$;

-- 6. RPC: reset order id counter back to 0 -------------------------
create or replace function reset_order_id_counter()
returns void
language sql
as $$
  update settings set next_order_id = 1 where id = 1;
$$;

-- 7. ROW LEVEL SECURITY ---------------------------------------------
alter table menu_items enable row level security;
alter table settings enable row level security;
alter table orders enable row level security;
alter table chat_messages enable row level security;

-- Public (anon key) can read menu + settings, and insert orders/chat
create policy "public read menu" on menu_items for select using (true);
create policy "public read settings" on settings for select using (true);
create policy "public insert orders" on orders for insert with check (true);
create policy "public read own orders by id" on orders for select using (true);
create policy "public read chat" on chat_messages for select using (true);
create policy "public insert chat" on chat_messages for insert with check (true);

-- Admin (logged-in via Supabase Auth email/password on admin.html) can
-- write everything. Create your admin login from the Supabase dashboard:
-- Authentication -> Users -> Add user.
create policy "admin write menu" on menu_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write settings" on settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write orders" on orders for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write chat" on chat_messages for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 8. STORAGE BUCKETS -------------------------------------------------
-- Run these separately if they fail here — Storage buckets can also be
-- created from the Supabase dashboard: Storage -> New bucket.
insert into storage.buckets (id, name, public) values ('menu-photos', 'menu-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('payment-screenshots', 'payment-screenshots', true)
  on conflict (id) do nothing;

create policy "public read menu photos" on storage.objects for select
  using (bucket_id = 'menu-photos');
create policy "public upload menu photos" on storage.objects for insert
  with check (bucket_id = 'menu-photos');
create policy "public read payment screenshots" on storage.objects for select
  using (bucket_id = 'payment-screenshots');
create policy "public upload payment screenshots" on storage.objects for insert
  with check (bucket_id = 'payment-screenshots');
create policy "admin delete menu photos" on storage.objects for delete
  using (bucket_id = 'menu-photos' and auth.role() = 'authenticated');
create policy "admin delete payment screenshots" on storage.objects for delete
  using (bucket_id = 'payment-screenshots' and auth.role() = 'authenticated');

-- 9. REALTIME (for the Chrome notification extension) ---------------
alter publication supabase_realtime add table orders;

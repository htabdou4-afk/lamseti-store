-- LAMSETI database setup for Supabase
-- Run this whole file in Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  image_url text,
  category text not null default 'notebooks',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_type text not null check (order_type in ('cart','notebook','business_cards')),
  customer_name text not null,
  phone text not null,
  wilaya text,
  city text,
  delivery_address text,
  items jsonb not null default '[]'::jsonb,
  custom_details jsonb not null default '{}'::jsonb,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  notes text,
  status text not null default 'new' check (status in ('new','confirmed','in_production','ready','shipped','delivered','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key check (id = 1),
  store_name text not null default 'LAMSETI',
  whatsapp text not null default '',
  order_message text not null default 'شكراً لطلبك من LAMSETI.',
  shipping_note text not null default 'يتم تأكيد تكلفة التوصيل حسب الولاية قبل الشحن.',
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- Starter catalog using the product photos bundled in the website repository.
insert into public.products (name, description, price, image_url, category, is_active)
select 'دفتر ملاحظاتي الوردي', 'غلاف مزخرف بالورود والفراشات. يمكن تخصيص الاسم والألوان.', 450, 'assets/pink-notebook.jpg', 'notebooks', true
where not exists (select 1 from public.products where name = 'دفتر ملاحظاتي الوردي');
insert into public.products (name, description, price, image_url, category, is_active)
select 'دفتر ملاحظاتي الأزرق', 'تصميم هادئ وأنيق قابل للتعديل حسب الطلب.', 450, 'assets/blue-notebook.jpg', 'notebooks', true
where not exists (select 1 from public.products where name = 'دفتر ملاحظاتي الأزرق');
insert into public.products (name, description, price, image_url, category, is_active)
select 'دفاتر بتصاميم متنوعة', 'نماذج متعددة للمذكرات والدفاتر الشخصية.', 500, 'assets/collection.jpg', 'notebooks', true
where not exists (select 1 from public.products where name = 'دفاتر بتصاميم متنوعة');

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "profile read self or admin" on public.profiles;
create policy "profile read self or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select to anon, authenticated
using (is_active = true or public.is_admin());
drop policy if exists "admin insert products" on public.products;
create policy "admin insert products" on public.products for insert to authenticated
with check (public.is_admin());
drop policy if exists "admin update products" on public.products;
create policy "admin update products" on public.products for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete products" on public.products;
create policy "admin delete products" on public.products for delete to authenticated
using (public.is_admin());

drop policy if exists "public create orders" on public.orders;
create policy "public create orders" on public.orders for insert to anon, authenticated
with check (status = 'new');
drop policy if exists "admin read orders" on public.orders;
create policy "admin read orders" on public.orders for select to authenticated
using (public.is_admin());
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read store settings" on public.store_settings;
create policy "public read store settings" on public.store_settings for select to anon, authenticated
using (true);
drop policy if exists "admin update store settings" on public.store_settings;
create policy "admin update store settings" on public.store_settings for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Product image bucket: public images, admin-only uploads/deletes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "public view product images" on storage.objects;
create policy "public view product images" on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());


-- API grants: RLS policies above remain the actual row-level security boundary.
grant usage on schema public to anon, authenticated;
grant select on public.products, public.store_settings to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select on public.profiles to authenticated;
grant select, update on public.orders to authenticated;
grant update on public.store_settings to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- IMPORTANT: after creating the owner account in Authentication > Users,
-- replace OWNER-USER-UUID below with that user's UUID and run:
-- insert into public.profiles (id, role) values ('OWNER-USER-UUID', 'admin')
-- on conflict (id) do update set role = 'admin';

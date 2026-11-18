-- =====================================================================
-- Comunidad Evangélica La Cosecha — Esquema base de Supabase
-- Ejecutar en el SQL Editor de Supabase. Requiere la extensión pg_cron.
-- RNF-04, RNF-14 (RLS), RF-20/21 (peticiones de oración), RF-35 (métricas)
-- =====================================================================

-- ---------- Administradores ----------
-- Las cuentas se crean en Supabase Auth; luego se agrega su id aquí (RF-24).
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create policy "admins: solo admins leen" on public.admins for select using (public.is_admin());

-- ---------- Contenido público ----------
create table if not exists public.about_sections (
  id text primary key,                      -- historia | mision | vision | valores | liderazgo
  eyebrow text not null, title text not null, subtitle text not null default '',
  body text not null, list text[], image text,
  position int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id text primary key, title text not null check (char_length(title) between 2 and 80),
  day smallint not null check (day between 0 and 6),
  time time not null, description text, featured boolean not null default false,
  published boolean not null default true
);

create table if not exists public.ministries (
  id text primary key, name text not null unique, summary text not null, description text not null,
  leaders text[] not null default '{}', activities text[] not null default '{}',
  icon text not null default 'users', image text,
  position int not null default 0, published boolean not null default true
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  description text, date date not null, time time, location text, image text,
  published boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null, body text not null, image text,
  date date not null default current_date, featured boolean not null default false,
  published boolean not null default false
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, image text not null,
  category text not null default 'general' check (category in ('general', 'destacada', 'hero', 'institucional')),
  featured boolean not null default false, published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, preacher text, date date not null,
  video_url text, facebook_url text check (facebook_url is null or facebook_url ~ '^https://(www\.|m\.)?facebook\.com/'),
  cover text, published boolean not null default false
);

-- RLS: lectura pública solo de lo publicado; escritura solo admins.
do $$
declare t text;
begin
  foreach t in array array['schedules', 'ministries', 'events', 'announcements', 'gallery', 'sermons'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: lectura publica" on public.%1$I for select using (published or public.is_admin())', t);
    execute format('create policy "%1$s: admins escriben" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

alter table public.about_sections enable row level security;
create policy "about: lectura publica" on public.about_sections for select using (true);
create policy "about: admins escriben" on public.about_sections for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Peticiones de oración (privadas) ----------
create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(name) <= 80),
  contact text check (contact is null or char_length(contact) <= 120),
  request text not null check (char_length(btrim(request)) between 10 and 1500),
  is_private boolean not null default true,
  consent boolean not null check (consent),
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.prayer_requests enable row level security;

-- Visitantes: solo pueden insertar (no leer, no modificar).
create policy "prayer: insertar publico" on public.prayer_requests
  for insert to anon, authenticated
  with check (reviewed = false and consent);
create policy "prayer: admins leen" on public.prayer_requests for select using (public.is_admin());
create policy "prayer: admins actualizan" on public.prayer_requests for update using (public.is_admin());
create policy "prayer: admins eliminan" on public.prayer_requests for delete using (public.is_admin());

-- Antiabuso (RNF-19): límite global de envíos por ventana de tiempo.
create or replace function public.prayer_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();             -- el cliente no puede falsear la fecha
  new.reviewed := false;
  if (select count(*) from public.prayer_requests where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'rate limit' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists prayer_rate_limit on public.prayer_requests;
create trigger prayer_rate_limit before insert on public.prayer_requests
  for each row execute function public.prayer_rate_limit();

-- RF-21 / RNF-39: eliminar peticiones con más de 3 meses (diariamente 03:00 UTC).
create extension if not exists pg_cron;
select cron.schedule(
  'purge-old-prayer-requests', '0 3 * * *',
  $$ delete from public.prayer_requests where created_at < now() - interval '3 months' $$
);

-- ---------- Métricas anónimas (RF-35) ----------
create table if not exists public.interactions (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('page_view', 'click')),
  detail text check (detail is null or char_length(detail) <= 300),
  path text not null check (char_length(path) <= 200),
  created_at timestamptz not null default now()
);
alter table public.interactions enable row level security;
create policy "interactions: insertar publico" on public.interactions for insert to anon, authenticated with check (true);
create policy "interactions: admins leen" on public.interactions for select using (public.is_admin());
create index if not exists interactions_created_idx on public.interactions (created_at);

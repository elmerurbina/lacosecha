-- =====================================================================
-- 002 — Soporte para el panel administrativo
-- Ejecutar después de 001_schema.sql. Es seguro volver a ejecutarlo.
-- RF-22..RF-37, RNF-14, RNF-20, RNF-39
-- =====================================================================

-- ---------- Ajustes generales del sitio (RF-27, 1.3) ----------
create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),   -- una sola fila
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "settings: lectura publica" on public.site_settings;
drop policy if exists "settings: admins escriben" on public.site_settings;
create policy "settings: lectura publica" on public.site_settings for select using (true);
create policy "settings: admins escriben" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Células / grupos de crecimiento ----------
create table if not exists public.cell_groups (
  id text primary key,
  host text not null check (char_length(host) between 2 and 80),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  position int not null default 0,
  published boolean not null default true
);
alter table public.cell_groups enable row level security;
drop policy if exists "cell_groups: lectura publica" on public.cell_groups;
drop policy if exists "cell_groups: admins escriben" on public.cell_groups;
create policy "cell_groups: lectura publica" on public.cell_groups for select using (published or public.is_admin());
create policy "cell_groups: admins escriben" on public.cell_groups for all using (public.is_admin()) with check (public.is_admin());

-- Marcas de tiempo de edición
alter table public.ministries    add column if not exists updated_at timestamptz not null default now();
alter table public.events        add column if not exists updated_at timestamptz not null default now();
alter table public.announcements add column if not exists created_at timestamptz not null default now();
alter table public.sermons       add column if not exists created_at timestamptz not null default now();

-- ---------- Métricas: visitantes y sesiones anónimas ----------
alter table public.interactions add column if not exists visitor_id text check (visitor_id is null or char_length(visitor_id) <= 64);
alter table public.interactions add column if not exists session_id text check (session_id is null or char_length(session_id) <= 64);
alter table public.interactions drop constraint if exists interactions_kind_check;
alter table public.interactions add constraint interactions_kind_check check (kind in ('page_view', 'click', 'prayer'));
create index if not exists interactions_kind_created_idx on public.interactions (kind, created_at);

-- Los visitantes solo pueden registrar visitas y clics; "prayer" lo registra el trigger.
drop policy if exists "interactions: insertar publico" on public.interactions;
create policy "interactions: insertar publico" on public.interactions
  for insert to anon, authenticated with check (kind in ('page_view', 'click'));

-- Cada petición de oración deja un registro anónimo permanente para las estadísticas
-- (las peticiones se borran a los 3 meses, el contador no).
create or replace function public.log_prayer_metric() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.interactions (kind, path) values ('prayer', '/contacto');
  return new;
end $$;
drop trigger if exists log_prayer_metric on public.prayer_requests;
create trigger log_prayer_metric after insert on public.prayer_requests
  for each row execute function public.log_prayer_metric();

-- Serie temporal (RF-35/36). Zona horaria de Nicaragua.
create or replace function public.admin_metrics(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table (bucket timestamp, page_views bigint, visitors bigint, sessions bigint, leads bigint, social bigint, prayers bigint)
language plpgsql stable security definer set search_path = public as $$
declare tz constant text := 'America/Managua';
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_bucket not in ('hour', 'day', 'week', 'month') then raise exception 'bucket inválido'; end if;
  return query
  with series as (
    select generate_series(
      date_trunc(p_bucket, p_from at time zone tz),
      date_trunc(p_bucket, p_to at time zone tz),
      ('1 ' || p_bucket)::interval
    ) as b
  ), agg as (
    select date_trunc(p_bucket, i.created_at at time zone tz) as b,
      count(*) filter (where i.kind = 'page_view') as pv,
      count(distinct i.visitor_id) filter (where i.kind = 'page_view') as vis,
      count(distinct i.session_id) filter (where i.kind = 'page_view') as ses,
      count(*) filter (where i.kind = 'click' and i.detail in ('whatsapp', 'phone', 'email')) as lds,
      count(*) filter (where i.kind = 'click' and i.detail in ('facebook', 'instagram', 'tiktok')) as soc,
      count(*) filter (where i.kind = 'prayer') as pr
    from public.interactions i
    where i.created_at >= p_from and i.created_at < p_to
    group by 1
  )
  select s.b, coalesce(a.pv, 0), coalesce(a.vis, 0), coalesce(a.ses, 0), coalesce(a.lds, 0), coalesce(a.soc, 0), coalesce(a.pr, 0)
  from series s left join agg a on a.b = s.b
  order by s.b;
end $$;

-- Totales del periodo y desgloses (clics por canal, páginas más vistas).
create or replace function public.admin_metrics_breakdown(p_from timestamptz, p_to timestamptz)
returns table (dimension text, label text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select 'totals'::text, 'visitors'::text, count(distinct visitor_id) from public.interactions
      where kind = 'page_view' and created_at >= p_from and created_at < p_to
    union all
    select 'totals', 'sessions', count(distinct session_id) from public.interactions
      where kind = 'page_view' and created_at >= p_from and created_at < p_to
    union all
    (select 'click', coalesce(detail, 'otro'), count(*) from public.interactions
      where kind = 'click' and created_at >= p_from and created_at < p_to
      group by detail order by 3 desc)
    union all
    (select 'page', path, count(*) from public.interactions
      where kind = 'page_view' and created_at >= p_from and created_at < p_to
      group by path order by 3 desc limit 8);
end $$;

revoke all on function public.admin_metrics(timestamptz, timestamptz, text) from public, anon;
revoke all on function public.admin_metrics_breakdown(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_metrics(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_metrics_breakdown(timestamptz, timestamptz) to authenticated;

-- Las métricas crudas se conservan 2 años.
select cron.schedule('purge-old-interactions', '30 3 * * 0',
  $$ delete from public.interactions where created_at < now() - interval '2 years' $$);

-- ---------- Almacenamiento multimedia (RF-26, RNF-05, RNF-20) ----------
-- Bucket público de solo lectura; límite de 50 MB y tipos MIME permitidos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media: lectura publica" on storage.objects;
drop policy if exists "media: admins suben" on storage.objects;
drop policy if exists "media: admins actualizan" on storage.objects;
drop policy if exists "media: admins eliminan" on storage.objects;
create policy "media: lectura publica" on storage.objects for select using (bucket_id = 'media');
create policy "media: admins suben" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin()
              and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif', 'mp4'));
create policy "media: admins actualizan" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy "media: admins eliminan" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- =====================================================================
-- 004 · Página de Células y ubicación exacta de la iglesia
-- Ejecutar después de 001, 002 y 003. Se puede ejecutar varias veces.
-- =====================================================================

-- ---------- Células: foto, título, descripción y horario ----------
alter table public.cell_groups add column if not exists title       text;
alter table public.cell_groups add column if not exists description text;
alter table public.cell_groups add column if not exists meeting     text;
alter table public.cell_groups add column if not exists image       text;
alter table public.cell_groups add column if not exists updated_at  timestamptz not null default now();

alter table public.cell_groups drop constraint if exists cell_groups_title_len;
alter table public.cell_groups add constraint cell_groups_title_len
  check (title is null or char_length(title) between 2 and 100);
alter table public.cell_groups drop constraint if exists cell_groups_description_len;
alter table public.cell_groups add constraint cell_groups_description_len
  check (description is null or char_length(description) <= 1200);
alter table public.cell_groups drop constraint if exists cell_groups_meeting_len;
alter table public.cell_groups add constraint cell_groups_meeting_len
  check (meeting is null or char_length(meeting) <= 80);
alter table public.cell_groups drop constraint if exists cell_groups_image_len;
alter table public.cell_groups add constraint cell_groups_image_len
  check (image is null or char_length(image) <= 500);

-- La ubicación pasa a ser opcional (una célula nueva puede publicarse antes de tener coordenadas).
alter table public.cell_groups alter column lat drop not null;
alter table public.cell_groups alter column lng drop not null;
alter table public.cell_groups drop constraint if exists cell_groups_latlng_pair;
alter table public.cell_groups add constraint cell_groups_latlng_pair
  check ((lat is null) = (lng is null));

-- Título inicial para las células existentes.
update public.cell_groups set title = 'Célula ' || host where title is null;

-- ---------- Ubicación exacta de la iglesia ----------
-- No requiere cambios de esquema: se guarda en site_settings.data -> 'location' = {"lat": ..., "lng": ...}
-- desde el panel (Información institucional → Contacto y ubicación → «Usar mi ubicación actual»).

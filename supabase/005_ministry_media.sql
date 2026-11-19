-- =====================================================================
-- 005 · Ministerios: varias fotos y videos, y portada elegida en el panel
-- Ejecutar después de 004. Se puede ejecutar varias veces.
-- =====================================================================

-- media: lista ordenada de archivos [{ "url": "...", "type": "image" | "video" }]
-- cover: URL del archivo (foto o video) que se usa como portada de la tarjeta.
-- image: se mantiene como la foto de portada (o la primera foto) para vistas que solo muestran imágenes.
alter table public.ministries add column if not exists media jsonb not null default '[]'::jsonb;
alter table public.ministries add column if not exists cover text;

alter table public.ministries drop constraint if exists ministries_media_shape;
alter table public.ministries add constraint ministries_media_shape
  check (jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 30);
alter table public.ministries drop constraint if exists ministries_cover_len;
alter table public.ministries add constraint ministries_cover_len
  check (cover is null or char_length(cover) <= 500);

-- Los ministerios que ya tenían foto pasan a tenerla en su galería y como portada.
update public.ministries
   set media = jsonb_build_array(jsonb_build_object('url', image, 'type', 'image')),
       cover = coalesce(cover, image)
 where image is not null and media = '[]'::jsonb;

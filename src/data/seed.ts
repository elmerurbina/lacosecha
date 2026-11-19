/**
 * Datos iniciales del sitio (documento "Información web – Comunidad Evangélica La Cosecha").
 *
 * Estos datos se usan como respaldo cuando Supabase no está configurado o no responde.
 * Una vez conectado el panel administrativo, el contenido vendrá de la base de datos
 * (ver `src/lib/content.ts` y `supabase/schema.sql`).
 *
 * Las imágenes apuntan a `/images/...` dentro de `public/`. Si un archivo no existe,
 * el componente <SmartImage> muestra automáticamente un placeholder.
 */
import type {
  AboutSection,
  Announcement,
  CellGroup,
  ChurchEvent,
  GalleryItem,
  Ministry,
  Schedule,
  Sermon,
  SiteInfo,
} from '../lib/types';

export const siteInfo: SiteInfo = {
  name: 'Comunidad Evangélica La Cosecha',
  shortName: 'La Cosecha',
  denomination: 'Asambleas de Dios',
  city: 'Juigalpa, Chontales, Nicaragua',
  address:
    'Gasolinera UNO, 3 cuadras al Este, donde fue el restaurante La Cazuelita, Juigalpa, Chontales',
  phone: '+505 8404 0236',
  whatsapp: '50584040236',
  email: 'comunidadevangelicalacosecha@gmail.com',
  motto: 'Jehová peleará por nosotros, y nosotros estaremos tranquilos',
  mottoRef: 'Éxodo 14:14',
  description:
    'La Comunidad Evangélica La Cosecha es una congregación cristiana ubicada en Juigalpa, Chontales, Nicaragua. Busca compartir el mensaje de Jesucristo, fortalecer la fe, formar discípulos y servir a las personas y familias de la comunidad mediante la enseñanza bíblica, la oración, la comunión y acciones de servicio.',
  founded: '2025-12-20',
  pastor: 'Pedro Obando',
  associatePastor: 'Fátima González',
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61583287506730',
    instagram: 'https://www.instagram.com/c.e.lacosecha',
    tiktok: 'https://www.tiktok.com/@c_e_lacosecha',
  },
  heroImage: '/images/galeria/hero.jpg',
  logo: '/logo.png',
};

export const schedules: Schedule[] = [
  { id: 'culto-dominical', title: 'Culto principal', day: 0, time: '17:30', description: 'Celebración dominical para toda la familia.', featured: true },
  { id: 'escuela-lideres', title: 'Escuela de líderes', day: 2, time: '19:00', description: 'Formación para los líderes de la iglesia.' },
  { id: 'culto-miercoles', title: 'Culto de entre semana', day: 3, time: '18:00', description: 'Palabra, oración y comunión a mitad de semana.' },
  { id: 'discipulado', title: 'Discipulado', day: 4, time: '18:00', description: 'Acompañamiento para los nuevos en la fe.' },
  { id: 'jovenes', title: 'Generación de Fuego', day: 5, time: '18:00', description: 'Reunión de jóvenes.' },
];

export const prayerNote = 'Oración y ayuno: de lunes a viernes, entre semana.';

export const aboutSections: AboutSection[] = [
  {
    id: 'historia',
    eyebrow: 'Nuestra historia',
    title: 'Una cosecha que comienza',
    subtitle: 'Fundada el 20 de diciembre de 2025',
    body:
      'La Comunidad Evangélica La Cosecha nace en Juigalpa, Chontales, el 20 de diciembre de 2025, bajo la cobertura de las Asambleas de Dios. Desde sus inicios ha buscado ser un hogar espiritual donde las familias conozcan a Jesucristo, crezcan en la Palabra y sirvan a su comunidad.',
    image: '/images/galeria/historia.jpg',
  },
  {
    id: 'mision',
    eyebrow: 'Misión',
    title: 'Compartir a Cristo y formar discípulos',
    subtitle: 'Nuestro propósito',
    // TODO: texto preliminar — confirmar con el pastor antes de publicar.
    body:
      'Compartir el mensaje de Jesucristo, fortalecer la fe y formar discípulos que sirvan a las personas y familias de nuestra comunidad mediante la enseñanza bíblica, la oración, la comunión y acciones de servicio.',
    image: '/images/mision.jpg',
  },
  {
    id: 'vision',
    eyebrow: 'Visión',
    title: 'Familias transformadas por el amor de Dios',
    subtitle: 'Hacia dónde vamos',
    // TODO: texto preliminar — confirmar con el pastor antes de publicar.
    body:
      'Ser una iglesia que lleve esperanza a Juigalpa y Chontales, levantando líderes y discípulos comprometidos con Cristo, y extendiendo su amor a cada hogar a través del servicio y la Palabra.',
    image: '/images/vision.jpg',
  },
  {
    id: 'valores',
    eyebrow: 'Valores',
    title: 'Lo que nos define',
    subtitle: 'Principios que guían nuestro caminar',
    body: 'Vivimos nuestra fe en comunidad, guiados por principios bíblicos que dan forma a todo lo que hacemos.',
    // TODO: confirmar la lista oficial de valores.
    list: ['Fe', 'Amor', 'Servicio', 'Unidad', 'Integridad'],
    image: '/images/galeria/valores.jpg',
  },
  {
    id: 'liderazgo',
    eyebrow: 'Liderazgo',
    title: 'Pastores que sirven',
    subtitle: 'Pastor Pedro Obando y Pastora Fátima González',
    body:
      'La congregación es pastoreada por el Pastor Pedro Obando (pastor general) y la Pastora Fátima González (pastora asociada), quienes junto al equipo ministerial guían, enseñan y acompañan a la iglesia.',
    image: '/images/galeria/liderazgo.jpg',
  },
];

export const ministries: Ministry[] = [
  {
    id: 'generacion-de-fuego',
    name: 'Generación de Fuego',
    summary: 'Ministerio de jóvenes: fe, amistad y propósito.',
    description:
      'Ministerio responsable de los jóvenes de la iglesia. Un espacio para crecer en la fe, compartir en comunidad y descubrir el propósito de Dios para cada vida.',
    leaders: ['Mackferson Sequeira', 'Juan Zambrana', 'Dareska Castilla'],
    activities: ['Reunión de jóvenes · Viernes 6:00 PM', 'Actividades juveniles'],
    icon: 'flame',
    image: '/images/ministerios/jovenes.jpg',
  },
  {
    id: 'escuela-de-lideres',
    name: 'Escuela de Líderes',
    summary: 'Formación para quienes sirven en la iglesia.',
    description: 'Ministerio encargado de enseñar y equipar a los líderes de la iglesia para servir con excelencia y carácter cristiano.',
    leaders: ['Pastor Pedro Obando', 'Pastora Fátima González'],
    activities: ['Clases · Martes 7:00 PM'],
    icon: 'book',
    image: '/images/ministerios/lideres.jpg',
  },
  {
    id: 'discipulado',
    name: 'Discipulado y Formación Bíblica',
    summary: 'Acompañamos a los nuevos en la fe.',
    description: 'Ministerio encargado de acompañar a los nuevos creyentes, enseñándoles los fundamentos de la fe y ayudándoles a crecer en su relación con Dios.',
    leaders: ['Mackferson Sequeira', 'Edwing Márquez'],
    activities: ['Discipulado · Jueves 6:00 PM'],
    icon: 'sprout',
    image: '/images/ministerios/discipulado.jpg',
  },
  {
    id: 'programa-esperanza',
    name: 'Programa Esperanza',
    summary: 'Amor y servicio a personas en necesidad.',
    description:
      'El Programa Esperanza es una iniciativa de amor y servicio que brinda apoyo a personas en situación de vulnerabilidad, ofreciéndoles alimento, aseo personal, acompañamiento y la Palabra de Dios. Buscamos restaurar vidas, devolver la dignidad y demostrar el amor de Cristo a quienes más lo necesitan.',
    leaders: ['Pastor Pedro Obando'],
    activities: ['Entrega de alimentos', 'Aseo personal', 'Acompañamiento'],
    icon: 'heart',
    image: '/images/ministerios/esperanza.jpg',
  },
  {
    id: 'evangelismo',
    name: 'Evangelismo y Alcance Comunitario',
    summary: 'Llevamos esperanza a cada hogar.',
    description: 'Busca compartir el mensaje de Jesucristo, llevando esperanza, fe y amor a las familias y personas de nuestra comunidad.',
    leaders: ['David Arana'],
    activities: ['Jornadas de evangelismo', 'Campañas', 'Servicio comunitario'],
    icon: 'megaphone',
    image: '/images/ministerios/evangelismo.jpg',
  },
  {
    id: 'alabanza',
    name: 'Ministerio de Alabanza',
    summary: 'Adoramos a Dios con música y canto.',
    description:
      'Tiene como propósito dirigir a la congregación en la adoración a Dios mediante la música y el canto, creando un ambiente de entrega, comunión y exaltación a nuestro Señor Jesucristo.',
    leaders: ['Dareska Castillo'],
    activities: ['Alabanza en cultos', 'Ensayos'],
    icon: 'music',
    image: '/images/ministerios/alabanza.jpg',
  },
  {
    id: 'intercesion',
    name: 'Ministerio de Intercesión',
    summary: 'Oración constante por la iglesia y la ciudad.',
    description:
      'Se dedica a la oración constante por la iglesia, sus líderes, las familias y las necesidades de la comunidad, creyendo en el poder de Dios para transformar vidas.',
    leaders: ['Lucía Salazar'],
    activities: ['Oración y ayuno · lunes a viernes'],
    icon: 'hands',
    image: '/images/ministerios/intercesion.jpg',
  },
  {
    id: 'multimedia',
    name: 'Ministerio de Multimedia',
    summary: 'Tecnología al servicio del mensaje.',
    description:
      'Se encarga de apoyar las actividades y servicios de la iglesia mediante recursos tecnológicos, proyección, fotografía, video y transmisión en redes sociales, llevando el mensaje de Dios a más personas.',
    leaders: ['Mackferson Sequeira'],
    activities: ['Proyección', 'Fotografía y video', 'Redes sociales'],
    icon: 'monitor',
    image: '/images/ministerios/multimedia.jpg',
  },
];

export const cellGroups: CellGroup[] = [
  { id: 'scarleth', title: 'Célula Hna. Scarleth', host: 'Hna. Scarleth', lat: 12.091683, lng: -85.36199 },
  { id: 'marquez', title: 'Célula Hno. Márquez', host: 'Hno. Márquez', lat: 12.10233, lng: -85.382252 },
  { id: 'david', title: 'Célula Hno. David', host: 'Hno. David', lat: 12.095677, lng: -85.370956 },
  { id: 'michael-yulissa', title: 'Célula Hnos. Michael y Yulissa', host: 'Hnos. Michael y Yulissa', lat: 12.112887, lng: -85.376536 },
  { id: 'dalia', title: 'Célula Hna. Dalia', host: 'Hna. Dalia', lat: 12.116288, lng: -85.372842 },
];

/** Eventos registrados. Se gestionarán desde el panel administrativo. */
export const events: ChurchEvent[] = [];

export const announcements: Announcement[] = [
  {
    id: 'redes',
    title: 'Síguenos en redes sociales',
    body: 'Todas nuestras actividades, eventos y anuncios especiales se publican en Facebook, Instagram y TikTok. ¡Síguenos para no perderte nada!',
    date: '2026-11-01',
    featured: true,
  },
  {
    id: 'celulas',
    title: 'Células en tu sector',
    body: 'Tenemos grupos de crecimiento en diferentes sectores de Juigalpa. Escríbenos por WhatsApp y te conectamos con el más cercano a tu hogar.',
    date: '2026-11-01',
  },
];

export const gallery: GalleryItem[] = [
  { id: 'g1', title: 'Culto dominical', image: '/images/galeria/1.jpg', featured: true },
  { id: 'g2', title: 'Generación de Fuego', image: '/images/galeria/2.jpg', featured: true },
  { id: 'g3', title: 'Programa Esperanza', image: '/images/galeria/3.jpg', featured: true },
  { id: 'g4', title: 'Ministerio de Alabanza', image: '/images/galeria/4.jpg', featured: true },
  { id: 'g5', title: 'Evangelismo', image: '/images/galeria/5.jpg', featured: true },
  { id: 'g6', title: 'Escuela de líderes', image: '/images/galeria/6.jpg', featured: true },
  { id: 'g7', title: 'Discipulado', image: '/images/galeria/7.jpg' },
  { id: 'g8', title: 'Intercesión', image: '/images/galeria/8.jpg' },
  { id: 'g9', title: 'Vida en comunidad', image: '/images/galeria/9.jpg' },
];

/** Prédicas. Vacío hasta que se registren desde el panel administrativo. */
export const sermons: Sermon[] = [];

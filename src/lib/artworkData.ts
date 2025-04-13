export interface ArtworkInfo {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  previewPath: string;  // Changed to required since we'll always have a preview
}

export const artworkData: Record<string, ArtworkInfo> = {
  'tori1': {
    id: 'tori1',
    title: 'TORI1',
    subtitle: '2024',
    description: 'Made by Alejandro',
    previewPath: ''  // Empty for now as we'll have a special visualizer
  },
  'tori2': {
    id: 'tori2',
    title: 'TORI2',
    subtitle: '2024',
    description: 'Made by Alejandro',
    previewPath: ''  // Empty as we'll use the special visualizer
  },
  'Plane__0017': {
    id: 'Plane__0017',
    title: 'PIRATA DEL GUATACARAZO',
    subtitle: 'Paseo Colon, Pedro Campos',
    description: '1985',
    previewPath: '/images/pirate.webp'
  },
  'Object_2005': {
    id: 'Object_2005',
    title: 'WEIWEI',
    subtitle: '27.9cm x 21.6cm [11\' x 8.5\']',
    description: 'November 2023',
    previewPath: '/images/Object_2005.webp'
  },
  toribash: {
    id: 'toribash',
    title: 'TORIBASH',
    subtitle: '2m x 5.5m [6\'6" x 18\']',
    description: 'June 2024',
    previewPath: '/images/toribash.webp'
  },
  venequidad: {
    id: 'venequidad',
    title: 'VENEQUIDAD',
    subtitle: '21.6cm x 27.9cm [8.5"x11"]',
    description: 'January 2025',
    previewPath: '/images/venequidad.webp'
  },
  engi: {
    id: 'engi',
    title: 'ENGINEER',
    subtitle: 'Digital commission for Hal',
    description: '2021',
    previewPath: '/images/engi.webp'
  },
  mural: {
    id: 'mural',
    title: 'HAVEN',
    subtitle: '2m x 4.5m [6\'6" x 14\'9"]',
    description: 'April 2022',
    previewPath: '/images/mural.webp'
  },
  mgs: {
    id: 'mgs',
    title: 'MGS',
    subtitle: '2m x 4m [6\'6" x 13\' 1"]',
    description: 'November 2024',
    previewPath: '/images/mgs.webp'
  },
  indios: {
    id: 'indios',
    title: 'INDIOS',
    subtitle: '30cm x 21.6cm [11" x 8"]',
    description: 'January 2025',
    previewPath: '/images/indios.webp'
  },
  lolita: {
    id: 'lolita',
    title: 'LOML',
    subtitle: '30cm x 21.6cm [11" x 8"]',
    description: 'February 2023',
    previewPath: '/images/lolita.webp'
  },
  selknam: {
    id: 'selknam',
    title: 'SELKNAM',
    subtitle: '21cm x 14.8cm [8.27" x 5.8"]',
    description: 'February 2022',
    previewPath: '/images/selknam.webp'
  },
  yeule: {
    id: 'yeule',
    title: 'YEULE',
    subtitle: '21cm x 14.8cm [8.27" x 5.8"]',
    description: 'January 2022',
    previewPath: '/images/yeule.webp'
  },
  china: {
    id: 'china',
    title: 'CH#1',
    subtitle: '14.8cm x 10.5cm [5.83" x 4.13"]',
    description: 'December 2021',
    previewPath: '/images/china.webp'
  },
  bonzi: {
    id: 'bonzi',
    title: 'BONZI',
    subtitle: '21cm x 14.8cm [8.27" x 5.8"]',
    description: 'November 2023',
    previewPath: '/images/bonzi.webp'
  },
  dnd: {
    id: 'dnd',
    title: 'THE END OF IT ALL',
    subtitle: 'Digital commission for Hal',
    description: '2022',
    previewPath: '/images/dnd.webp'
  },
  samurai: {
    id: 'samurai',
    title: 'MINAMOTO',
    subtitle: 'Digital commission for Hal',
    description: '2021',
    previewPath: '/images/samurai.webp'
  },
  persona: {
    id: 'persona',
    title: 'THE DARK SEXTET',
    subtitle: 'Digital commission for Hal',
    description: '2021',
    previewPath: '/images/persona.webp'
  },
  tesla: {
    id: 'tesla',
    title: 'NIKOLA',
    subtitle: '14.8cm x 10.5cm [5.83" x 4.13"]',
    description: 'December 2021',
    previewPath: '/images/tesla.webp'
  },
  moto: {
    id: 'moto',
    title: 'MOTO',
    subtitle: '30cm x 21.6cm [11" x 8"]',
    description: 'September 2022',
    previewPath: '/images/moto.webp'
  },
  toris: {
    id: 'toris',
    title: 'TB WORLD CHAMPIONSHIP',
    subtitle: 'Digital',
    description: '2022',
    previewPath: '/images/toris.webp'
  },
  angel: {
    id: 'angel',
    title: 'ANGEL',
    subtitle: 'Digital commission for Tristan',
    description: '2022',
    previewPath: '/images/angel.webp'
  },
  alan: {
    id: 'alan',
    title: 'ALAN SLEEVE',
    subtitle: 'Digital commission for Alan',
    description: '2023',
    previewPath: '/images/alan.webp'
  },
  drg: {
    id: 'drg',
    title: 'MISSION CONTROLLED',
    subtitle: 'Digital commission for Confixil',
    description: '2023',
    previewPath: '/images/drg.webp'
  },
  rosita: {
    id: 'rosita',
    title: 'ROSITA YUQUITA',
    subtitle: '14.8cm x 10.5cm [4.13" x 5.83"]',
    description: 'January 2022',
    previewPath: '/images/rosita.webp'
  },
  daggers: {
    id: 'daggers',
    title: 'DAGGERS',
    subtitle: '21.6cm x 27.9cm [8.5"x11"]',
    description: 'Tattoo concept, April 2023',
    previewPath: '/images/daggers.webp'
  },
  forro: {
    id: 'forro',
    title: 'CASE',
    subtitle: '15.8cm x 7.4cm [6.5"x3"]',
    description: 'April 2022',
    previewPath: '/images/forro.webp'
  },
  elephant: {
    id: 'elephant',
    title: 'POOKIEPHANT',
    subtitle: '30cm x 21.6cm [11" x 8"]',
    description: 'September 2022',
    previewPath: '/images/elephant.webp'
  },
  linda: {
    id: 'linda',
    title: 'LINDA EVANGELISTA',
    subtitle: '15.8cm x 7.4cm [6.5"x3"]',
    description: 'December 2021',
    previewPath: '/images/linda.webp'
  },
  mickey: {
    id: 'mickey',
    title: 'MICKEY BOXING',
    subtitle: '14.8cm x 10.5cm [5.83" x 4.13"]',
    description: '2020',
    previewPath: '/images/mickey.webp'
  },
  'qr_cube': {
    id: 'qr_cube',
    title: 'CONTACT',
    subtitle: 'HOMBRECHIVO.COM',
    description: '2025',
    previewPath: '/images/qr.webp'
  },
  'Cube005': {
    id: 'Cube005',
    title: 'ARTIST CONTACT INFORMATION',
    subtitle: 'DM@HOMBRECHIVO.COM - INFO@CACHAMA.COM',
    description: 'PORTAFOLIO EN HONOR A VLADIMIR VILLEGAS Y GUAICAIPURO LAMEDA',
    previewPath: '/images/qr2.webp'
  }
}; 
import { Track } from '@/stores/audioStore';

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Create the base tracks array
const baseTracks: Track[] = [
  {
    title: 'UH AH',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/UH AH.webp',
    audioFile: '/audio/music/UH AH.ogg'
  },
  {
    title: 'CLUELESSV2',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/CLUELESSV2.webp',
    audioFile: '/audio/music/CLUELESSV2.ogg'
  },
  {
    title: 'TOMITIPI',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/TOMITIPI.webp',
    audioFile: '/audio/music/TOMITIPI.ogg'
  },
  {
    title: 'MERCAL',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/MERCAL.webp',
    audioFile: '/audio/music/MERCAL.ogg'
  },
  {
    title: 'MENENDEZ',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/MENENDEZ.webp',
    audioFile: '/audio/music/MENENDEZ.ogg'
  },
  {
    title: 'DILO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/DILO.webp',
    audioFile: '/audio/music/DILO.ogg'
  },
  {
    title: 'WALLAH',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/WALLAH.webp',
    audioFile: '/audio/music/WALLAH.ogg'
  },
  {
    title: 'SILBON',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/SILBON.webp',
    audioFile: '/audio/music/SILBON.ogg'
  },
  {
    title: 'COKITO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/COKITO.webp',
    audioFile: '/audio/music/COKITO.ogg'
  },
  {
    title: 'ANTEPASADOS',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/ANTEPASADOS.webp',
    audioFile: '/audio/music/ANTEPASADOS.ogg'
  },
  {
    title: 'JUNIO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/JUNIO.webp',
    audioFile: '/audio/music/JUNIO.ogg'
  },
  {
    title: 'JUGUETE',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/JUGUETE.webp',
    audioFile: '/audio/music/JUGUETE.ogg'
  },
  {
    title: 'METRO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/METRO.webp',
    audioFile: '/audio/music/METRO.ogg'
  },
  {
    title: 'SUPERBLOQUIAO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/SUPERBLOQUIAO.webp',
    audioFile: '/audio/music/SUPERBLOQUIAO.ogg'
  },
  {
    title: 'CHIKICHI',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/CHIKICHI.webp',
    audioFile: '/audio/music/CHIKICHI.ogg'
  },
  {
    title: 'MISION MILAGRO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/MISION MILAGRO.webp',
    audioFile: '/audio/music/MISION MILAGRO.ogg'
  },
  {
    title: 'AMOLADOR',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/AMOLADOR.webp',
    audioFile: '/audio/music/AMOLADOR.ogg'
  },
  {
    title: 'TARAKO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/TARAKO.webp',
    audioFile: '/audio/music/TARAKO.ogg'
  },
  {
    title: '260324',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/260324.webp',
    audioFile: '/audio/music/260324.ogg'
  },
  {
    title: 'ESTANCIA',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/ESTANCIA.webp',
    audioFile: '/audio/music/ESTANCIA.ogg'
  },
  {
    title: 'NEGRITO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/NEGRITO.webp',
    audioFile: '/audio/music/NEGRITO.ogg'
  },
  {
    title: 'BOKITA',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/BOKITA.webp',
    audioFile: '/audio/music/BOKITA.ogg'
  },
  {
    title: 'SAPOS',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/SAPOS.webp',
    audioFile: '/audio/music/SAPOS.ogg'
  },
  {
    title: 'VIGILIA',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/VIGILIA.webp',
    audioFile: '/audio/music/VIGILIA.ogg'
  },
  {
    title: 'YANOMAMI',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/YANOMAMI.webp',
    audioFile: '/audio/music/YANOMAMI.ogg'
  },
  {
    title: 'CHIMO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/CHIMO.webp',
    audioFile: '/audio/music/CHIMO.ogg'
  },
  {
    title: 'TANTO AMOR',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/TANTO AMOR.webp',
    audioFile: '/audio/music/TANTO AMOR.ogg'
  },
  {
    title: 'MATAN A LA GENTE',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/MATAN A LA GENTE.webp',
    audioFile: '/audio/music/MATAN A LA GENTE.ogg'
  },
  {
    title: 'CANDELA',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/CANDELA.webp',
    audioFile: '/audio/music/CANDELA.ogg'
  },
  {
    title: 'QQSPB',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/QQSPB.webp',
    audioFile: '/audio/music/QQSPB.ogg'
  },
  {
    title: '290324',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/290324.webp',
    audioFile: '/audio/music/290324.ogg'
  },
  {
    title: 'LA ESPERANZA',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/LA ESPERANZA.webp',
    audioFile: '/audio/music/LA ESPERANZA.ogg'
  },
  {
    title: 'LA NOCHE FATAL',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/LA NOCHE FATAL.webp',
    audioFile: '/audio/music/LA NOCHE FATAL.ogg'
  },
  {
    title: 'MOROKA JIA',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/MOROKA JIA.webp',
    audioFile: '/audio/music/MOROKA JIA.ogg'
  },
  {
    title: 'STEPHV1',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/STEPHV1.webp',
    audioFile: '/audio/music/STEPHV1.ogg'
  },
  {
    title: 'BOZZO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/BOZZO.webp',
    audioFile: '/audio/music/BOZZO.ogg'
  },
  {
    title: 'ME VALORO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/ME VALORO.webp',
    audioFile: '/audio/music/ME VALORO.ogg'
  }
];

// Create the final playlist with CORAZON VENEZOLANO first, then the rest shuffled
export const playlist: Track[] = [
  {
    title: 'CORAZON VENEZOLANO',
    author: 'bzk',
    duration: 180,
    coverArt: '/audio/music/coverart/CORAZON VENEZOLANO.webp',
    audioFile: '/audio/music/CORAZON VENEZOLANO.ogg'
  },
  ...shuffleArray(baseTracks)
]; 
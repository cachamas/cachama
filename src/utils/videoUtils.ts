export const VIDEO_BASE_URL = 'https://pub-6da74f19df414672ba0ea1c0f7dd1f8a.r2.dev';

const VIDEO_URL_MAP: Record<string, string> = {
  overworld: `${VIDEO_BASE_URL}/overworld.mp4`,
  central: `${VIDEO_BASE_URL}/central.mp4`,
  gallery: `${VIDEO_BASE_URL}/gallery.mp4`,
  gct: `${VIDEO_BASE_URL}/gct.mp4`,
  music: `${VIDEO_BASE_URL}/music.mp4`,
  toris: `${VIDEO_BASE_URL}/toris.mp4`,
};

export function getVideoUrlForMap(mapName: string): string {
  return VIDEO_URL_MAP[mapName] || `${VIDEO_BASE_URL}/overworld.mp4`;
}

export const INTRO_VIDEO_URL = `${VIDEO_BASE_URL}/intro.mp4`;

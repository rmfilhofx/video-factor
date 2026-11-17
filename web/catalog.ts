export const videos = [
  {
    id: 'gta6-promo',
    title: 'GTA 6 — Promo de Live',
    category: 'Promo de live',
    description: 'Uma chamada cinematográfica para a live de GTA 6, com arte ilustrativa e trilha originais.',
    file: 'GTA6Promo.mp4',
    poster: 'gta6-poster.jpg',
    seconds: 20,
    size: '11,2 MB',
    audio: 'Trilha e efeitos originais',
    remotion: true,
  },
  {
    id: 'teaser-curto',
    title: 'Teaser curto',
    category: 'Teaser',
    description: 'Um teaser vertical de quatro segundos para anunciar uma transmissão.',
    file: 'TeaserCurto.mp4',
    poster: 'teaser-poster.jpg',
    seconds: 4,
    size: '2,3 MB',
    audio: 'Sem áudio',
    remotion: false,
  },
  {
    id: 'trading-stop-editorial',
    title: 'Levou stop? — Editorial',
    category: 'Trading',
    description: 'Clipes de mercado, títulos em destaque e narração sobre como lidar com o impulso depois de um stop.',
    file: 'TradingStop-Editorial.mp4',
    poster: 'trading-stop-editorial.jpg',
    seconds: 19,
    size: '7,2 MB',
    audio: 'Narração sintetizada em português',
    remotion: false,
  },
  {
    id: 'trading-stop',
    title: 'Levou stop? — Gráfico animado',
    category: 'Trading',
    description: 'A versão com gráfico ilustrativo, legendas e waveform sincronizada com a narração.',
    file: 'TradingStop.mp4',
    poster: 'trading-stop.jpg',
    seconds: 19,
    size: '5,5 MB',
    audio: 'Narração sintetizada em português',
    remotion: false,
  },
] as const;

export type VideoEntry = (typeof videos)[number];

export const mediaUrl = (file: string) => `/videos/${file}`;
export const timecode = (seconds: number) => `0:${String(seconds).padStart(2, '0')}`;

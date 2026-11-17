const commons = 'https://commons.wikimedia.org/w/api.php';
const agent = 'VideoFactory/1.0 (https://video-factory-zeta.vercel.app/)';
const requestHeaders = {'User-Agent': agent, 'Api-User-Agent': agent};
const licenses = new Set(['CC0', 'CC BY 4.0', 'CC BY 3.0', 'CC BY 2.0', 'Public domain']);
const imageHost = (url: URL) => url.protocol === 'https:' &&
  ['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname);

type Metadata = Record<string, {value: string} | undefined>;
type SearchResult = {
  title: string;
  index: number;
  imageinfo?: {thumburl?: string; descriptionurl?: string; extmetadata?: Metadata}[];
};

export type Credit = {title: string; author: string; license: string; source: string};
type Photo = Credit & {url: string};

function plain(value: string, max: number) {
  return Array.from(value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
}

export async function photosFor(query: string): Promise<Photo[]> {
  const url = new URL(commons);
  url.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: `${query} filetype:bitmap -intitle:logo -intitle:diagram -intitle:screenshot -intitle:illustration -intitle:flag`,
    gsrnamespace: '6', gsrlimit: '18', prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiurlwidth: '960', format: 'json', formatversion: '2',
  }).toString();
  const res = await fetch(url, {headers: requestHeaders, signal: AbortSignal.timeout(8000), cache: 'no-store'});
  if (!res.ok) throw new Error('O banco de fotos está temporariamente indisponível.');
  const data: {query?: {pages?: SearchResult[]}} = await res.json();

  return (data.query?.pages ?? []).sort((a, b) => a.index - b.index).flatMap((page) => {
    const info = page.imageinfo?.[0];
    const license = info?.extmetadata?.LicenseShortName?.value;
    const author = plain(info?.extmetadata?.Artist?.value ?? '', 95);
    if (!info?.thumburl || !info.descriptionurl || !license || !licenses.has(license) ||
      !imageHost(new URL(info.thumburl)) || !info.descriptionurl.startsWith('https://commons.wikimedia.org/wiki/')) return [];
    if (license.startsWith('CC BY') && !author) return [];
    return [{
      url: info.thumburl, source: info.descriptionurl,
      author: author || 'Autor não informado', license,
      title: plain(page.title.replace(/^File:/, '').replace(/\.[^.]+$/, '').replaceAll('_', ' '), 90),
    }];
  });
}

export async function downloadPhoto(url: string) {
  const res = await fetch(url, {headers: requestHeaders, redirect: 'error', signal: AbortSignal.timeout(8000), cache: 'no-store'});
  if (!res.ok || !res.body || !/^image\/(jpeg|png|webp)\b/.test(res.headers.get('content-type') ?? '')) {
    throw new Error('Não foi possível baixar a fotografia.');
  }
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) return Buffer.concat(parts, size);
      size += value.length;
      if (size > 5_000_000) throw new Error('Fotografia acima do limite.');
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

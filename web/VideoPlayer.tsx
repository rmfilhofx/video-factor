'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {Film, Ratio} from 'lucide-react';
import {mediaUrl, type VideoEntry} from './catalog';

const Preview = dynamic(() => import('./Preview'), {
  ssr: false,
  loading: () => <p className="preview-loading" role="status">Carregando prévia…</p>,
});

export function VideoPlayer({video}: {video: VideoEntry}) {
  const [preview, setPreview] = useState(false);
  return (
    <section className="screen" aria-label="Player de vídeo">
      {video.remotion && (
        <div className="player-tabs" aria-label="Modo do player">
          <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}><Film size={15} /> MP4</button>
          <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}><Ratio size={15} /> Prévia Remotion</button>
        </div>
      )}
      <div className="player-frame">
        {preview ? <Preview /> : (
          <video controls playsInline preload="metadata" poster={mediaUrl(video.poster)} aria-label={video.title}>
            <source src={mediaUrl(video.file)} type="video/mp4" />
          </video>
        )}
      </div>
    </section>
  );
}

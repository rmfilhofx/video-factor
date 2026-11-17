'use client';

import {useState} from 'react';
import {ArrowRight, ArrowDownToLine, Film, Play} from 'lucide-react';
import Link from 'next/link';
import {mediaUrl, timecode, videos, type VideoEntry} from './catalog';
import {VideoPlayer} from './VideoPlayer';

function VideoDetails({video}: {video: VideoEntry}) {
  return (
    <div className="video-details">
      <span className="detail-kicker"><Film size={15} /> {video.category}</span>
      <h2>{video.title}</h2>
      <p>{video.description}</p>
      <dl className="video-facts">
        <div><dt>Formato</dt><dd>9:16 · 1080 × 1920</dd></div>
        <div><dt>Duração</dt><dd>{video.seconds} segundos</dd></div>
        <div><dt>Quadros por segundo</dt><dd>30 fps</dd></div>
        <div><dt>Arquivo</dt><dd>MP4 · {video.size}</dd></div>
        <div><dt>Áudio</dt><dd>{video.audio}</dd></div>
      </dl>
      <a className="primary-button download" href={mediaUrl(video.file) + '?download=1'} download={video.file}>
        <ArrowDownToLine size={19} /> Baixar MP4
      </a>
    </div>
  );
}

export function VideoLibrary({dashboard = false}: {dashboard?: boolean}) {
  const [selected, setSelected] = useState<VideoEntry>(videos[0]);

  return (
    <>
      <div className="showcase" id="player">
        <VideoPlayer key={selected.id} video={selected} />
        <VideoDetails video={selected} />
      </div>
      <section className="collection" aria-labelledby="library-title">
        <div className="section-heading">
          <h2 id="library-title">{dashboard ? 'Vídeos recentes' : 'Todos os vídeos'}</h2>
          {dashboard && <Link href="/biblioteca">Ver biblioteca <ArrowRight size={16} /></Link>}
        </div>
        <ul className="video-list">
          {videos.map((video) => (
            <li key={video.id}>
              <a href="#player" className="video-card" aria-current={selected.id === video.id ? 'true' : undefined} onClick={() => setSelected(video)}>
                <span className="card-cover" style={{backgroundImage: `url("${mediaUrl(video.poster)}")`}}><Play size={15} fill="currentColor" /></span>
                <span className="card-info"><strong>{video.title}</strong><span>{video.category} · {timecode(video.seconds)} · 9:16</span></span>
                <ArrowRight size={17} className="card-arrow" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

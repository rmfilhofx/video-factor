import type {Metadata} from 'next';
import {VideoLibrary} from '../../web/VideoLibrary';

export const metadata: Metadata = {title: 'Biblioteca'};

export default function Library() {
  return (
    <>
      <header className="page-heading"><div><h1>Biblioteca</h1><p>Selecione um vídeo para assistir ou baixar em MP4.</p></div></header>
      <VideoLibrary />
    </>
  );
}

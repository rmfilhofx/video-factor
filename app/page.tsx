import {Plus} from 'lucide-react';
import Link from 'next/link';
import {VideoLibrary} from '../web/VideoLibrary';

export default function Dashboard() {
  return (
    <>
      <header className="page-heading">
        <div><h1>Dashboard</h1><p>Assista às suas produções e baixe os arquivos finais.</p></div>
        <Link className="primary-button" href="/criar"><Plus size={19} /> Criar vídeo</Link>
      </header>
      <VideoLibrary dashboard />
    </>
  );
}

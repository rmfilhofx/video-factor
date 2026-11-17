import type {Metadata} from 'next';
import {CreateVideo} from '../../web/CreateVideo';

export const metadata: Metadata = {title: 'Criar vídeo'};

export default function Create() {
  return (
    <>
      <header className="page-heading"><div><h1>Criar vídeo</h1><p>Transforme seu roteiro em um MP4 com fotografias reais.</p></div></header>
      <CreateVideo />
    </>
  );
}

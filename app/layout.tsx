import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {Navigation} from '../web/Navigation';
import './globals.css';

export const metadata: Metadata = {
  title: {default: 'VIDEO FACTORY', template: '%s · VIDEO FACTORY'},
  description: 'Biblioteca de vídeos e prévias do VIDEO FACTORY.',
};

export default function Layout({children}: {children: ReactNode}) {
  return (
    <html lang="pt-BR">
      <body>
        <Navigation />
        <main className="workspace">{children}</main>
      </body>
    </html>
  );
}

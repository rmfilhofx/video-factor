'use client';

import {Clapperboard, GalleryVerticalEnd, LayoutDashboard, Sparkles} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

const routes = [
  {href: '/', label: 'Dashboard', icon: LayoutDashboard},
  {href: '/biblioteca', label: 'Biblioteca', icon: GalleryVerticalEnd},
  {href: '/criar', label: 'Criar vídeo', icon: Sparkles},
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link className="brand" href="/">
        <span className="brand-icon"><Clapperboard size={18} /></span>
        <span>VIDEO<span className="brand-accent"> FACTORY</span></span>
      </Link>
      <nav aria-label="Navegação principal">
        {routes.map(({href, label, icon: Icon}) => (
          <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>
            <Icon size={17} aria-hidden /> <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer"><span className="status-dot" /> Estúdio de produção</div>
    </aside>
  );
}

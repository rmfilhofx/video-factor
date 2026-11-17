import type {Metadata} from 'next';
import {CloudOff, History, Sparkles} from 'lucide-react';

export const metadata: Metadata = {title: 'Criar vídeo'};

export default function Create() {
  return (
    <>
      <header className="page-heading"><div><h1>Criar vídeo</h1><p>Defina o roteiro e as preferências de produção.</p></div></header>
      <div className="creation-grid">
        <section className="creation-panel" aria-labelledby="project-title">
          <h2 id="project-title">Novo vídeo</h2>
          <p className="notice" id="render-status"><CloudOff size={19} /> Renderização em nuvem não configurada</p>
          <div className="creation-fields">
            <label>Roteiro ou prompt<textarea rows={6} placeholder="Descreva o vídeo que você quer produzir." /></label>
            <div className="select-grid">
              <label>Formato<select defaultValue="9:16"><option>9:16</option><option>16:9</option><option>1:1</option></select></label>
              <label>Duração<select defaultValue="20"><option value="15">15 segundos</option><option value="20">20 segundos</option><option value="30">30 segundos</option><option value="60">60 segundos</option></select></label>
              <label>Estilo visual<select><option>Cinematográfico</option><option>Minimalista</option><option>Editorial</option><option>Neon</option></select></label>
            </div>
            <button className="primary-button" type="button" disabled aria-describedby="render-status"><Sparkles size={18} /> Gerar Vídeo</button>
          </div>
        </section>
        <section className="creation-panel history" aria-labelledby="history-title">
          <h2 id="history-title"><History size={19} /> Histórico</h2>
          <p>Aguardando a configuração do serviço de renderização.</p>
        </section>
      </div>
    </>
  );
}

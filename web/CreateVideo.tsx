'use client';

import {ArrowDownToLine, History, LoaderCircle, Sparkles} from 'lucide-react';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {readHistory, saveVideo, type Generated} from './generated-history';

function Result({item}: {item: Generated}) {
  const [url, setUrl] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    const next = URL.createObjectURL(item.file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [item.file]);

  return (
    <section className="creation-panel generated-result" aria-labelledby="generated-title">
      <h2 id="generated-title" ref={heading} tabIndex={-1}>Vídeo pronto</h2>
      <p>{item.format} · {item.seconds} segundos · MP4</p>
      {url && <>
        <video src={url} controls playsInline preload="metadata" aria-label={item.label} />
        <a className="primary-button" href={url} download="VideoFactory.mp4">
          <ArrowDownToLine size={17} /> Baixar MP4
        </a>
      </>}
      {item.credits.some((credit) => credit.illustrative) && (
        <p>O banco não encontrou uma foto adequada para uma ou mais cenas. Essas cenas usam um fundo fotográfico ilustrativo.</p>
      )}
      <h3>Créditos das fotos</h3>
      <ul>
        {item.credits.map((credit) => (
          <li key={credit.source}>
            <a href={credit.source} target="_blank" rel="noreferrer">{credit.title}</a>
            <span>{credit.author} · {credit.license}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CreateVideo() {
  const [history, setHistory] = useState<Generated[]>([]);
  const [result, setResult] = useState<Generated>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    let active = true;
    readHistory().then((items) => {
      if (active) setHistory((current) => current.length ? current : items);
    }).catch(() => {
      if (active) setWarning('O histórico local está indisponível neste navegador.');
    });
    return () => {active = false;};
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const prompt = String(values.get('prompt') ?? '').trim();
    const format = String(values.get('format'));
    const seconds = Number(values.get('seconds'));
    setError('');
    if (!prompt) {
      setError('Escreva um tema ou roteiro.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/gerar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt, format, seconds, style: values.get('style')}),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(failure?.error ?? 'A geração foi interrompida. Tente novamente.');
      }
      if (response.headers.get('Content-Type') !== 'video/mp4') throw new Error('A resposta não contém um MP4.');
      const credits = JSON.parse(decodeURIComponent(response.headers.get('X-Video-Credits') ?? '[]'));
      const file = await response.blob();
      if (!file.size) throw new Error('O vídeo retornou vazio. Tente novamente.');
      const item = {id: Date.now(), label: prompt.slice(0, 100), format, seconds, credits, file};
      setResult(item);
      setHistory((items) => [item, ...items].slice(0, 8));
      await saveVideo(item).catch(() => setWarning('Baixe o MP4 agora. O navegador não conseguiu gravá-lo no histórico.'));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível gerar o vídeo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="creation-grid">
        <section className="creation-panel" aria-labelledby="project-title">
          <h2 id="project-title">Novo vídeo</h2>
          <p className="notice">Escreva sobre o tema que quiser. Para organizar o vídeo, separe até três cenas por linha.</p>
          <form className="creation-fields" onSubmit={submit} aria-busy={busy}>
            <label>Roteiro ou prompt
              <textarea name="prompt" rows={5} required maxLength={750}
                placeholder={'O que você quer mostrar?\nEx.: um café artesanal, uma viagem ou um produto novo'} />
            </label>
            <div className="select-grid">
              <label>Formato<select name="format" defaultValue="9:16"><option>9:16</option><option>16:9</option><option>1:1</option></select></label>
              <label>Duração<select name="seconds" defaultValue="20">
                {[15, 20, 30, 60].map((n) => <option key={n} value={n}>{n} segundos</option>)}
              </select></label>
              <label>Estilo visual<select name="style"><option>Cinematográfico</option><option>Minimalista</option><option>Editorial</option><option>Neon</option></select></label>
            </div>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {busy ? 'Gerando vídeo…' : 'Gerar Vídeo'}
            </button>
            {busy && <p role="status">Buscando fotos e renderizando o MP4. Mantenha esta aba aberta.</p>}
            {error && <p className="generation-error" role="alert">{error}</p>}
          </form>
        </section>
        <section className="creation-panel history" aria-labelledby="history-title">
          <h2 id="history-title"><History size={19} /> Histórico</h2>
          <p>{history.length ? 'Vídeos recentes deste navegador.' : 'Seus vídeos gerados aparecerão aqui.'}</p>
          {warning && <p role="status">{warning}</p>}
          {history.length > 0 && <ul className="generated-history">
            {history.map((item) => <li key={item.id}>
              <button type="button" aria-pressed={result?.id === item.id} onClick={() => setResult(item)}>
                <strong>{item.label}</strong><span>{item.format} · {item.seconds}s</span>
              </button>
            </li>)}
          </ul>}
        </section>
      </div>
      {result && <Result key={result.id} item={result} />}
    </>
  );
}

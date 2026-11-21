'use client';

import {ChangeEvent, useEffect, useRef, useState} from 'react';
import {Film, Scissors, Sparkles, Upload, Play, Pause} from 'lucide-react';

type Mode = 'manual' | 'automatic';
const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return '00:00';
  const seconds = Math.floor(value);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function ClipsPage() {
  const [mode, setMode] = useState<Mode>('manual');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState('');
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [hook, setHook] = useState('ERA SÓ ARRUMAR A PIA... 💀');
  const [hookDuration, setHookDuration] = useState(0.2);
  const [cameraPosition, setCameraPosition] = useState('top-left');
  const [cameraSize, setCameraSize] = useState('small');
  const [cta, setCta] = useState('SEGUE PRA MAIS! @itssromulo');
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState('');

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('video/')) return;
    fileRef.current = file;
    setRenderError('');
    setVideoUrl(URL.createObjectURL(file));
    setFilename(file.name);
    setDuration(0);
    setStart(0);
    setEnd(0);
    setPlaying(false);
  }

  function seek(time: number) {
    if (video.current) video.current.currentTime = time;
  }

  async function renderClip() {
    if (!fileRef.current || rendering || end <= start) return;
    setRendering(true);
    setRenderError('');
    try {
      const form = new FormData();
      form.set('video', fileRef.current);
      form.set('settings', JSON.stringify({startSeconds: start, endSeconds: end, cameraPosition, cameraSize, hook, hookDuration, cta}));
      const response = await fetch('/api/clips/render', {method: 'POST', body: form});
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Falha na renderização.'); }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'clip-factory.mp4';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {setRenderError(error instanceof Error ? error.message : 'Falha inesperada.');}
    finally {setRendering(false);}
  }

  function saveSettings() {
    const settings = {version: 1, sourceFilename: filename, mode, startSeconds: start, endSeconds: end, output: {width: 1080, height: 1920, fps: 30}, layout: {cameraPosition, cameraSize, avoidUpscaling: true}, hook: {text: hook, durationSeconds: hookDuration, useRealGameplayFrame: true}, cta: {text: cta, durationSeconds: 3}};
    const blob = new Blob([JSON.stringify(settings, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'clip-factory-settings.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <header className="page-heading"><div><h1>CLIP FACTORY</h1><p>Transforme suas lives em cortes verticais com ganchos que prendem a atenção.</p></div></header>
      <div className="clip-mode-tabs" role="tablist" aria-label="Modo de edição">
        <button type="button" role="tab" aria-selected={mode === 'manual'} onClick={() => setMode('manual')}><Scissors size={17}/> Semiautomático</button>
        <button type="button" role="tab" aria-selected={mode === 'automatic'} onClick={() => setMode('automatic')}><Sparkles size={17}/> Automático com IA</button>
      </div>
      {mode === 'automatic' ? (
        <section className="creation-panel clip-notice"><Sparkles size={24}/><h2>Seleção automática de melhores momentos</h2><p>Em preparação: essa função vai exigir transcrição e um processador de vídeo na nuvem. Nenhuma cobrança ou análise por IA é iniciada nesta versão.</p><button type="button" className="primary-button" onClick={() => setMode('manual')}>Começar pelo modo semiautomático</button></section>
      ) : (
        <div className="clip-layout">
          <section className="creation-panel">
            <h2>1. Escolha sua gravação</h2>
            <input ref={input} type="file" accept="video/*" onChange={upload} className="clip-hidden-input" aria-label="Selecionar vídeo"/>
            <button className="clip-upload" type="button" onClick={() => input.current?.click()}><Upload size={25}/><strong>{filename || 'Selecionar vídeo do computador'}</strong><span>O arquivo permanece no navegador nesta etapa; não é enviado ao servidor.</span></button>
            {videoUrl && <div className="clip-source">
              <video ref={video} src={videoUrl} controls playsInline preload="metadata" onLoadedMetadata={event => { const d = event.currentTarget.duration; if (Number.isFinite(d)) {setDuration(d);setEnd(Math.min(d, 30));}}} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>
              <div className="clip-controls"><button type="button" onClick={() => {if (!video.current) return; if (playing) video.current.pause(); else void video.current.play();}}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? 'Pausar' : 'Reproduzir'}</button><span>{formatTime(duration)} de vídeo</span></div>
              <h2>2. Selecione o trecho</h2>
              <div className="clip-range"><label>Início: {formatTime(start)}<input type="range" min={0} max={duration || 1} step={0.1} value={start} onChange={event => {const n=Number(event.target.value);setStart(Math.min(n,Math.max(0,end-0.1)));seek(n);}}/></label><label>Fim: {formatTime(end)}<input type="range" min={0} max={duration || 1} step={0.1} value={end} onChange={event => {const n=Number(event.target.value);setEnd(Math.max(n,start+0.1));seek(n);}}/></label></div>
              <p className="clip-help">Duração selecionada: {Math.max(0,end-start).toFixed(1)} segundos</p>
            </div>}
          </section>
          <section className="creation-panel clip-settings">
            <h2>3. Personalize seu corte</h2>
            <label>Gancho inicial<input value={hook} onChange={event => setHook(event.target.value)} maxLength={120}/></label>
            <label>Duração do flash de abertura<select value={hookDuration} onChange={event => setHookDuration(Number(event.target.value))}><option value={0.1}>0,1 segundo</option><option value={0.2}>0,2 segundo</option><option value={0.5}>0,5 segundo</option><option value={1}>1 segundo</option></select></label>
            <label>Posição da webcam<select value={cameraPosition} onChange={event => setCameraPosition(event.target.value)}><option value="top-left">Superior esquerda</option><option value="top-right">Superior direita</option><option value="none">Sem webcam</option></select></label>
            <label>Tamanho da webcam<select value={cameraSize} onChange={event => setCameraSize(event.target.value)}><option value="small">Pequena — preserva nitidez</option><option value="medium">Média</option></select></label>
            <label>Chamada final<input value={cta} onChange={event => setCta(event.target.value)} maxLength={120}/></label>
            <div className="clip-summary"><Film size={18}/><span>1080 × 1920 · 30 FPS · Imagem do próprio gameplay · CTA de 3 segundos</span></div>
            <button type="button" className="primary-button" onClick={renderClip} disabled={!videoUrl || end <= start || rendering}>{rendering ? "Gerando MP4..." : "Gerar corte MP4"}</button>
            {renderError && <p role="alert" className="clip-help">{renderError}</p>}
            <button type="button" onClick={saveSettings} disabled={!videoUrl || end <= start}>Salvar configuração JSON</button>
            <p className="clip-help">Renderização experimental na Vercel: arquivos de até 3,5 MB, cortes de até 45 segundos. Para lives completas precisaremos de armazenamento e worker dedicado.</p>
          </section>
        </div>
      )}
    </>
  );
}

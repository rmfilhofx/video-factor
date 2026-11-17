import {AbsoluteFill, Html5Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import {reveal, sceneMotion} from './animation';
import {buildTimeline, durationOf, type SceneSpec, type VideoSpec} from './spec';
import './video.css';

const palettes = {
  dusk: {accent: '#ffad99', tint: '#7c2f61', hue: 0},
  heat: {accent: '#ffc871', tint: '#99442b', hue: 15},
  violet: {accent: '#e7baff', tint: '#422186', hue: -38},
  signal: {accent: '#95ffdc', tint: '#065b62', hue: 132},
};

function Scene({scene, index, total, branding}: {
  scene: SceneSpec; index: number; total: number; branding: VideoSpec['branding'];
}) {
  const frame = useCurrentFrame();
  const last = index === total - 1;
  const {accent, tint, hue} = palettes[scene.palette];
  const motion = sceneMotion(frame, scene.durationInFrames, index, last);
  const media = scene.media;
  const titleY = index % 3 === 1 ? 395 : index % 3 === 2 ? 575 : 520;
  return (
    <AbsoluteFill className="scene">
      <AbsoluteFill style={{transform: `scale(${motion.zoom})`, transformOrigin: index % 2 ? '60% 52%' : '42% 60%'}}>
        {media?.kind === 'video' ? (
          <OffthreadVideo className="backdrop" src={staticFile(media.src)} muted />
        ) : (
          <Img className="backdrop" src={staticFile(media?.src ?? 'original-skyline.jpg')}
            style={{filter: media ? undefined : `hue-rotate(${hue}deg)`}} />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(170deg,#090715 4%,${tint}14 55%,#0b091bd9 90%), linear-gradient(90deg,#0a071b8c,transparent 85%)`}} />
      <AbsoluteFill className="film-frame" />
      {branding && <header className="slate">
        <span className="brand"><i style={{background: accent}} /> {branding.name}</span>
        <span>{branding.label}</span>
      </header>}
      <div className="titles" style={{top: titleY}}>
        {scene.eyebrow && <div className="eyebrow" style={{color: accent, ...reveal(frame, 0, 'fade', scene.durationInFrames)}}>{scene.eyebrow}</div>}
        {scene.lines.map((line, lineIndex) => {
          const isFirst = lineIndex === 0;
          const isLast = lineIndex === scene.lines.length - 1;
          const size = Math.min(isFirst ? 168 : 145, 1050 / Math.max(1, Array.from(line).length));
          return (
            <div key={lineIndex} className="title-line" style={{
              fontSize: size, color: isFirst || isLast ? accent : '#fff6ee',
              ...reveal(frame, lineIndex + 1, scene.animation, scene.durationInFrames),
            }}>{line}</div>
          );
        })}
        <div className="rule" style={{background: accent, width: 65 + (frame / scene.durationInFrames) * 140}} />
      </div>
      {!media && <div className="art-label">ARTE ILUSTRATIVA ORIGINAL</div>}
      <footer className="slate footer">
        <span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        <div className="segments">
          {Array.from({length: total}, (_, n) => <i key={n} style={{background: n === index ? accent : '#ffffff40'}} />)}
        </div>
      </footer>
      {!last && <AbsoluteFill style={{
        background: `linear-gradient(110deg, transparent 46%, ${accent} 49%, #fff3e5 51%, transparent 55%)`,
        transform: `translateX(${160 - motion.swipe * 285}%)`, opacity: motion.swipe * 0.78,
      }} />}
      <AbsoluteFill style={{background: accent, opacity: motion.flash}} />
      <AbsoluteFill style={{background: '#090715', opacity: motion.end}} />
    </AbsoluteFill>
  );
}

export function Video({video: {scenes, audio, branding}}: {video: VideoSpec}) {
  const totalFrames = durationOf(scenes);
  return (
    <AbsoluteFill style={{background: '#0b091b'}}>
      {audio?.bed && <Html5Audio src={staticFile(audio.bed)} loop
        volume={(frame) => audio.volume * 0.46 * Math.max(0, Math.min(1, (totalFrames - frame - 1) / 20))} />}
      {buildTimeline(scenes).map(({scene, from, index}) => (
        <Sequence key={from} from={from} durationInFrames={scene.durationInFrames} name={scene.lines.join(' ')}>
          <Scene scene={scene} index={index} total={scenes.length} branding={branding} />
          {audio?.cue && <Html5Audio src={staticFile(audio.cue)} volume={audio.volume} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import {AnimatedStick, StickMode} from './AnimatedStick';

// SACRED FILM — SacredEcho33 full narrated Bible teaching video (16:9, 1920x1080).
// Each scene is held for exactly the length of its narration (voice synced to scene).
// Warm cinematic scenes, cream text, rose accent, CSB scripture cards. No black bg.

const ROSE = '#c45670';
const CREAM = '#f6f1e8';
const SANS = '"Poppins","Helvetica Neue",Arial,sans-serif';
const SERIF = 'Georgia,"Times New Roman",serif';

export type SScene = {
  kind: 'title' | 'scene' | 'verse' | 'close';
  label: string;
  ref?: string;
  img?: string;
  audio?: string;
  frames: number;
  motion?: StickMode;   // when set, a REAL animated stick figure plays over the scene
};
export type SProps = {title: string; accent?: string; scenes: SScene[]};

const KB: React.FC<{img: string; d: number; dir: number}> = ({img, d, dir}) => {
  const f = useCurrentFrame();
  const t = f / Math.max(1, d);
  const scale = dir % 2 === 0 ? interpolate(t, [0, 1], [1.05, 1.16]) : interpolate(t, [0, 1], [1.16, 1.05]);
  const dx = interpolate(t, [0, 1], [0, dir % 2 === 0 ? -30 : 26]);
  return (
    <AbsoluteFill>
      <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${dx}px)`}} />
    </AbsoluteFill>
  );
};

const Scrim: React.FC<{strong?: boolean}> = ({strong}) => (
  <AbsoluteFill
    style={{
      background: strong
        ? 'linear-gradient(180deg, rgba(38,26,20,.30) 0%, rgba(38,26,20,.05) 30%, rgba(38,26,20,.38) 66%, rgba(30,20,16,.74) 100%)'
        : 'linear-gradient(0deg, rgba(30,20,16,.74) 0%, rgba(38,26,20,.14) 34%, rgba(0,0,0,0) 60%)',
    }}
  />
);

const Scene: React.FC<{s: SScene; idx: number; accent: string}> = ({s, idx, accent}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = s.frames;
  const fade = Math.min(
    interpolate(f, [0, 14], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(f, [d - 14, d], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
  );
  const up = interpolate(spring({frame: f, fps, config: {damping: 200}}), [0, 1], [40, 0]);
  const op = interpolate(f, [8, 28], [0, 1], {extrapolateRight: 'clamp'});
  const sweep = interpolate(f, [18, 46], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bg = s.img ? <KB img={s.img} d={d} dir={idx} /> : <AbsoluteFill style={{background: '#e9dec8'}} />;
  // the figure genuinely animates on top of the scene art (real motion, not a pan)
  const img = (
    <>
      {bg}
      {s.motion ? <AnimatedStick mode={s.motion} /> : null}
    </>
  );
  const aud = s.audio ? <Audio src={staticFile(s.audio)} /> : null;

  if (s.kind === 'title' || s.kind === 'close') {
    return (
      <AbsoluteFill style={{opacity: fade}}>
        {img}
        <Scrim strong />
        {aud}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 140px'}}>
          <div style={{transform: `translateY(${up}px)`, opacity: op, textAlign: 'center'}}>
            <div style={{fontFamily: SANS, fontSize: 92, fontWeight: 800, lineHeight: 1.08, color: CREAM, textShadow: '0 6px 34px rgba(0,0,0,.6)', whiteSpace: 'pre-line'}}>{s.label}</div>
            <div style={{height: 8, width: `${sweep * 260}px`, background: accent, borderRadius: 8, margin: '34px auto 0'}} />
            {s.ref ? <div style={{fontFamily: SANS, fontSize: 34, letterSpacing: 4, textTransform: 'uppercase', color: CREAM, opacity: 0.92, marginTop: 28}}>{s.ref}</div> : null}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (s.kind === 'verse') {
    return (
      <AbsoluteFill style={{opacity: fade}}>
        {img}
        <Scrim strong />
        {aud}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 170px'}}>
          <div style={{transform: `translateY(${up}px)`, opacity: op, textAlign: 'center'}}>
            <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 72, lineHeight: 1.28, color: CREAM, textShadow: '0 5px 30px rgba(0,0,0,.6)', whiteSpace: 'pre-line'}}>{'“' + s.label + '”'}</div>
            <div style={{fontFamily: SANS, fontSize: 28, letterSpacing: 5, textTransform: 'uppercase', color: accent, marginTop: 30, fontWeight: 700}}>{s.ref}</div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // scene: lower-third caption
  return (
    <AbsoluteFill style={{opacity: fade}}>
      {img}
      <Scrim />
      {aud}
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 120px 110px'}}>
        <div style={{transform: `translateY(${up}px)`, opacity: op, maxWidth: 1320}}>
          <div style={{height: 7, width: `${sweep * 120}px`, background: accent, borderRadius: 7, marginBottom: 22}} />
          <div style={{fontFamily: SANS, fontSize: 64, fontWeight: 800, lineHeight: 1.12, color: CREAM, textShadow: '0 4px 24px rgba(0,0,0,.7)', whiteSpace: 'pre-line'}}>{s.label}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SacredFilm: React.FC<SProps> = ({accent, scenes}) => {
  const {durationInFrames} = useVideoConfig();
  const f = useCurrentFrame();
  const acc = accent || ROSE;
  let from = 0;
  const prog = interpolate(f, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#e9dec8'}}>
      {scenes.map((s, i) => {
        const seq = (
          <Sequence key={i} from={from} durationInFrames={s.frames}>
            <Scene s={s} idx={i} accent={acc} />
          </Sequence>
        );
        from += s.frames;
        return seq;
      })}
      <AbsoluteFill style={{justifyContent: 'flex-start'}}>
        <div style={{height: 7, width: `${prog * 100}%`, background: acc, opacity: 0.92}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const sacredMetadata = ({props}: {props: SProps}) => ({
  durationInFrames: Math.max(30, props.scenes.reduce((a, b) => a + (b.frames || 30), 0)),
});

import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import {PoseStick, StickMode} from './PoseStick';

// SACRED FILM — SacredEcho33 narrated Bible video (16:9, 1920x1080).
// Two lanes in one composition:
//  - Cinematic lane (Ruth): AI scene art, cream text over a scrim.
//  - Stickman lane (Elijah): the LOCKED AI-generated pose sprites (never hand-drawn)
//    cycling on a clean warm paper horizon. Text lives in the TOP band, the figure on
//    the horizon in the BOTTOM band — overlap is structurally impossible.
// Each scene is held for exactly the length of its narration (voice-first sync).

const ROSE = '#c45670';
const CREAM = '#f6f1e8';
const INK = '#3d3a37';
const PAPER = '#f8f4ec';
const SANS = '"Poppins","Helvetica Neue",Arial,sans-serif';
const SERIF = 'Georgia,"Times New Roman",serif';

export type SScene = {
  kind: 'title' | 'scene' | 'verse' | 'close';
  label: string;
  ref?: string;
  img?: string;
  audio?: string;
  frames: number;
  motion?: StickMode;   // set => stickman lane (AI pose sprites, real motion)
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

// Clean stick-lane world: warm paper, soft horizon line, a low sun for the hopeful
// closing beats. Deliberate and minimal — never a muddy generated background.
const StickWorld: React.FC<{sun?: boolean}> = ({sun}) => (
  <AbsoluteFill style={{background: PAPER}}>
    {sun ? (
      <div style={{position: 'absolute', left: 1450, top: 560, width: 230, height: 230, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,86,112,.34) 0%, rgba(196,86,112,.10) 55%, rgba(196,86,112,0) 75%)'}} />
    ) : null}
    <div style={{position: 'absolute', left: 0, right: 0, top: 845, height: 5, background: INK, opacity: 0.22, borderRadius: 4}} />
  </AbsoluteFill>
);

const StickScene: React.FC<{s: SScene; accent: string}> = ({s, accent}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = s.frames;
  const fade = Math.min(
    interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(f, [d - 12, d], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
  );
  const up = interpolate(spring({frame: f, fps, config: {damping: 200}}), [0, 1], [30, 0]);
  const op = interpolate(f, [6, 24], [0, 1], {extrapolateRight: 'clamp'});
  const sweep = interpolate(f, [14, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const verse = s.kind === 'verse';
  const big = s.kind === 'title' || s.kind === 'close';
  const sun = s.motion === 'rise' || s.motion === 'stand';
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <StickWorld sun={sun} />
      {s.audio ? <Audio src={staticFile(s.audio)} /> : null}
      {/* TEXT — top band only (never taller than 400px, figure starts at 445+) */}
      <div style={{position: 'absolute', top: 70, left: 140, right: 140, maxHeight: 380, textAlign: 'center',
        transform: `translateY(${up}px)`, opacity: op}}>
        <div style={{
          fontFamily: verse ? SERIF : SANS,
          fontStyle: verse ? 'italic' : 'normal',
          fontWeight: verse ? 400 : 800,
          fontSize: big ? 84 : verse ? 66 : 58,
          lineHeight: 1.14, color: INK, whiteSpace: 'pre-line',
        }}>{verse ? '“' + s.label + '”' : s.label}</div>
        <div style={{height: 8, width: `${sweep * 240}px`, background: accent, borderRadius: 8, margin: '24px auto 0'}} />
        {s.ref ? (
          <div style={{fontFamily: SANS, fontSize: 30, letterSpacing: 4, textTransform: 'uppercase',
            color: verse ? accent : INK, opacity: 0.85, marginTop: 20, fontWeight: 700}}>{s.ref}</div>
        ) : null}
      </div>
      {/* FIGURE — the locked AI character, genuinely moving, on the horizon */}
      {s.motion ? <PoseStick mode={s.motion} d={d} /> : null}
    </AbsoluteFill>
  );
};

const Scene: React.FC<{s: SScene; idx: number; accent: string}> = ({s, idx, accent}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = s.frames;
  if (s.motion) {
    return <StickScene s={s} accent={accent} />;
  }
  const fade = Math.min(
    interpolate(f, [0, 14], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(f, [d - 14, d], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
  );
  const up = interpolate(spring({frame: f, fps, config: {damping: 200}}), [0, 1], [40, 0]);
  const op = interpolate(f, [8, 28], [0, 1], {extrapolateRight: 'clamp'});
  const sweep = interpolate(f, [18, 46], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const img = s.img ? <KB img={s.img} d={d} dir={idx} /> : <AbsoluteFill style={{background: '#e9dec8'}} />;
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
  const stick = scenes.some((s) => s.motion);
  const prog = interpolate(f, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: stick ? PAPER : '#e9dec8'}}>
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

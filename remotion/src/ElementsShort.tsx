import React from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, random, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';

// ELEMENTS SHORT — Elements of Power channel (9:16, 1080x1920).
// Educational + mystical + sci fi + empowering. Opens on Lizzy's Canva element image,
// teaches one sourced fact with true spoken-word captions (voice-first beats), lands on
// a declaration and the Activate the Elements challenge invite. Style locked to the
// Elements of Power emblem (cosmic circle, water left, fire right, rose accents).

const ROSE = '#c45670';
const CREAM = '#fef2f4';
const NAVY = '#10131c';
const FONT = '"Poppins","Helvetica Neue",-apple-system,"Segoe UI",Roboto,sans-serif';

export type EScene = {
  kind: 'opener' | 'teach' | 'declare' | 'cta';
  label: string;        // on-screen text (captions carry the spoken words on teach beats)
  ref?: string;         // citation chip / series tag
  img?: string;         // filename under public/
  fg?: string | null;   // subject cutout (owned 2.5D layer animation)
  fx?: string;          // particle system: embers | water | motes | rays | wind | spirit
  audio?: string;       // filename under public/
  narr?: string;        // spoken text (carried for QA)
  captions?: {text: string; from: number; to: number}[];  // gapless caption schedule
  frames: number;
};

// ANIMATION LAYERS (owned, code driven, Academy doctrine: simple motions perfectly
// timed to the voice; animate objects, keep captions bold and punchy).

const FX_COLORS: Record<string, string[]> = {
  embers: ['#ffb35c', '#ff7a3d', '#ffd9a0'],
  water: ['#7fd4ff', '#b8ecff', '#4fb3e8'],
  motes: ['#ffd98a', '#c9f2a5', '#fef2f4'],
  rays: ['#fef2f4', '#f0b3bd', '#ffd9a0'],
  wind: ['#dfe9f5', '#b9c8dd', '#fef2f4'],
  spirit: ['#c9a0ff', '#e6d2ff', '#fef2f4'],
};

const Particles: React.FC<{fx: string; d: number; seed: number}> = ({fx, d, seed}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const colors = FX_COLORS[fx] || FX_COLORS.motes;
  const N = 46;
  const dots = [];
  for (let i = 0; i < N; i++) {
    const r1 = random(`x${seed}-${i}`), r2 = random(`y${seed}-${i}`), r3 = random(`s${seed}-${i}`);
    const size = 3 + r3 * (fx === 'embers' ? 7 : 10);
    const speed = 0.6 + r2 * 1.6;
    const rise = (f * speed + r1 * height * 2) % (height + 240);
    const y = fx === 'water' ? (rise * 0.35) % (height + 120) - 60 : height + 120 - rise;
    const x = r1 * width + Math.sin(f / (16 + r2 * 22) + i) * (fx === 'wind' ? 90 : 34);
    const op = Math.max(0, Math.sin((rise / (height + 240)) * Math.PI)) * (0.28 + r3 * 0.5);
    const c = colors[i % colors.length];
    dots.push(
      <div key={i} style={{position: 'absolute', left: x, top: y, width: size,
        height: fx === 'rays' ? size * (8 + r2 * 14) : size, borderRadius: fx === 'rays' ? 3 : '50%',
        background: c, opacity: op, filter: `blur(${fx === 'rays' ? 3 : 1}px)`,
        boxShadow: `0 0 ${10 + size * 2}px ${c}`,
        transform: fx === 'rays' ? 'rotate(14deg)' : undefined}} />
    );
  }
  return <AbsoluteFill style={{pointerEvents: 'none'}}>{dots}</AbsoluteFill>;
};

// The subject breathes, sways, and floats free of the drifting background: 2.5D.
const LivingScene: React.FC<{img: string; fg?: string | null; d: number; dir: number}> = ({img, fg, d, dir}) => {
  const f = useCurrentFrame();
  const t = f / Math.max(1, d);
  const bgScale = dir % 2 === 0 ? interpolate(t, [0, 1], [1.1, 1.24]) : interpolate(t, [0, 1], [1.24, 1.1]);
  const bgDx = interpolate(t, [0, 1], [0, dir % 2 === 0 ? -34 : 30]);
  const breathe = 1 + 0.014 * Math.sin(f / 23);
  const bob = 7 * Math.sin(f / 31);
  const sway = 0.5 * Math.sin(f / 47);
  const fgScale = (dir % 2 === 0 ? interpolate(t, [0, 1], [1.05, 1.14]) : interpolate(t, [0, 1], [1.14, 1.05])) * breathe;
  return (
    <AbsoluteFill>
      <Img src={staticFile(img)} style={{position: 'absolute', width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'center 30%',
        transform: `scale(${bgScale}) translateX(${bgDx}px)`, filter: 'brightness(0.9)'}} />
      {fg ? (
        <Img src={staticFile(fg)} style={{position: 'absolute', width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 30%',
          transform: `scale(${fgScale}) translate(${bgDx * 0.4}px, ${bob}px) rotate(${sway}deg)`,
          filter: 'drop-shadow(0 0 44px rgba(196,86,112,0.35))'}} />
      ) : null}
    </AbsoluteFill>
  );
};

const GlowPulse: React.FC<{accent: string}> = ({accent}) => {
  const f = useCurrentFrame();
  const op = 0.16 + 0.12 * Math.sin(f / 27) + interpolate(f, [0, 10], [0.25, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: `radial-gradient(70% 46% at 50% 44%, ${accent}44 0%, rgba(0,0,0,0) 70%)`, opacity: op, pointerEvents: 'none'}} />;
};
export type EProps = {title: string; element?: string; accent?: string; scenes: EScene[]};

const Cosmic: React.FC = () => (
  <AbsoluteFill style={{background: `radial-gradient(120% 75% at 50% 30%, #232a3d 0%, ${NAVY} 58%, #070910 100%)`}} />
);

const KB: React.FC<{img: string; d: number; dir: number; contain?: boolean}> = ({img, d, dir, contain}) => {
  const f = useCurrentFrame();
  const t = f / Math.max(1, d);
  const scale = dir % 2 === 0 ? interpolate(t, [0, 1], [1.04, 1.16]) : interpolate(t, [0, 1], [1.16, 1.04]);
  const dy = interpolate(t, [0, 1], [0, dir % 2 === 0 ? -22 : 18]);
  if (img.endsWith('.mp4') || img.endsWith('.webm')) {
    // TRUE MOTION (Lizzy 2026-07-23): generated motion clips loop under the type.
    return (
      <AbsoluteFill>
        <OffthreadVideo
          muted
          loop
          playbackRate={0.6}
          src={staticFile(img)}
          style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${Math.max(1.02, scale * 0.98)})`}}
        />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Img
        src={staticFile(img)}
        style={contain
          ? {width: '100%', transform: `scale(${scale}) translateY(${dy}px)`, filter: 'drop-shadow(0 0 60px rgba(196,86,112,0.35))'}
          : {width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', transform: `scale(${scale}) translateY(${dy}px)`}}
      />
    </AbsoluteFill>
  );
};

const Scrim: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(7,9,16,0.94) 0%, rgba(7,9,16,0.42) 30%, rgba(7,9,16,0.06) 55%, rgba(7,9,16,0.38) 100%)'}} />
);

const Fade: React.FC<{d: number; children: React.ReactNode}> = ({d, children}) => {
  const f = useCurrentFrame();
  const fade = Math.min(
    interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(f, [d - 10, d], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
  );
  return <AbsoluteFill style={{opacity: fade}}>{children}</AbsoluteFill>;
};

const Scene: React.FC<{s: EScene; idx: number; accent: string; element?: string}> = ({s, idx, accent, element}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = s.frames;
  const rise = spring({frame: f, fps, config: {damping: 200}});
  const y = interpolate(rise, [0, 1], [46, 0]);
  const op = interpolate(f, [6, 22], [0, 1], {extrapolateRight: 'clamp'});
  const sweep = interpolate(f, [14, 38], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const aud = s.audio ? <Audio src={staticFile(s.audio)} /> : null;

  if (s.kind === 'opener') {
    // Lizzy's Canva element image, element word huge, series tag beneath.
    const glow = interpolate(f, [0, 30], [0, 1], {extrapolateRight: 'clamp'});
    return (
      <Fade d={d}>
        <Cosmic />
        {s.img && s.fg ? <LivingScene img={s.img} fg={s.fg} d={d} dir={0} /> : s.img ? <KB img={s.img} d={d} dir={0} contain /> : null}
        {s.fx ? <Particles fx={s.fx} d={d} seed={11} /> : null}
        <GlowPulse accent={accent} />
        <Scrim />
        {aud}
        <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 130}}>
          <div style={{textAlign: 'center', transform: `translateY(${y}px)`, opacity: op}}>
            <div style={{fontFamily: FONT, fontSize: 40, letterSpacing: 12, textTransform: 'uppercase', color: CREAM, opacity: 0.9}}>Elements of Power</div>
            <div style={{fontFamily: FONT, fontSize: 150, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase', color: CREAM, lineHeight: 1.02, textShadow: `0 0 ${60 * glow}px rgba(196,86,112,0.8), 0 6px 40px rgba(0,0,0,0.8)`}}>{element}</div>
            <div style={{height: 8, width: `${sweep * 240}px`, background: accent, borderRadius: 8, margin: '26px auto 0'}} />
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 150}}>
          <div style={{fontFamily: FONT, fontSize: 52, fontWeight: 700, color: CREAM, textAlign: 'center', padding: '0 90px', textShadow: '0 3px 24px rgba(0,0,0,0.9)', opacity: op}}>{s.label}</div>
          {s.ref ? <div style={{fontFamily: FONT, fontSize: 30, letterSpacing: 5, textTransform: 'uppercase', color: accent, marginTop: 18, fontWeight: 700}}>{s.ref}</div> : null}
        </AbsoluteFill>
      </Fade>
    );
  }

  if (s.kind === 'declare') {
    const pop = spring({frame: f, fps, config: {damping: 140}});
    const sc = interpolate(pop, [0, 1], [0.86, 1]);
    return (
      <Fade d={d}>
        <Cosmic />
        {s.img && s.fg ? <LivingScene img={s.img} fg={s.fg} d={d} dir={idx} /> : s.img ? <KB img={s.img} d={d} dir={idx} /> : null}
        {s.fx ? <Particles fx={s.fx} d={d} seed={idx * 5 + 1} /> : null}
        <AbsoluteFill style={{background: 'radial-gradient(90% 60% at 50% 50%, rgba(16,19,28,0.35) 0%, rgba(7,9,16,0.88) 100%)'}} />
        {aud}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 100px'}}>
          <div style={{transform: `scale(${sc})`, textAlign: 'center'}}>
            <div style={{fontFamily: FONT, fontSize: 34, letterSpacing: 8, textTransform: 'uppercase', color: accent, fontWeight: 700, marginBottom: 36}}>Speak it</div>
            <div style={{fontFamily: FONT, fontSize: 92, fontWeight: 800, lineHeight: 1.14, color: CREAM, textShadow: '0 0 70px rgba(196,86,112,0.55)', whiteSpace: 'pre-line'}}>{s.label}</div>
            <div style={{height: 8, width: `${sweep * 220}px`, background: accent, borderRadius: 8, margin: '40px auto 0'}} />
          </div>
        </AbsoluteFill>
      </Fade>
    );
  }

  if (s.kind === 'cta') {
    return (
      <Fade d={d}>
        <Cosmic />
        {s.img ? (
          <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 170}}>
            {s.img.endsWith('.mp4') || s.img.endsWith('.webm') ? (
              <OffthreadVideo muted loop playbackRate={0.6} src={staticFile(s.img)} style={{width: 560, height: 560, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 90px rgba(196,86,112,0.5)`, border: `6px solid ${accent}`}} />
            ) : (
              <Img src={staticFile(s.img)} style={{width: 560, height: 560, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 90px rgba(196,86,112,0.5)`, border: `6px solid ${accent}`}} />
            )}
          </AbsoluteFill>
        ) : null}
        {aud}
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 200}}>
          <div style={{textAlign: 'center', transform: `translateY(${y}px)`, opacity: op, padding: '0 90px'}}>
            <div style={{fontFamily: FONT, fontSize: 62, fontWeight: 800, color: CREAM, lineHeight: 1.2, whiteSpace: 'pre-line'}}>{s.label}</div>
            {s.ref ? <div style={{fontFamily: FONT, fontSize: 34, letterSpacing: 5, textTransform: 'uppercase', color: accent, marginTop: 26, fontWeight: 700}}>{s.ref}</div> : null}
          </div>
        </AbsoluteFill>
      </Fade>
    );
  }

  // teach scene: unbroken narration, captions change on the timing schedule above it
  const cap = (s.captions && s.captions.length)
    ? (s.captions.find((c) => f >= c.from && f < c.to) || null)
    : {text: s.label, from: 0, to: d};
  const capLocal = cap ? Math.max(0, f - cap.from) : 0;
  const capRise = spring({frame: capLocal, fps, config: {damping: 200}});
  const capY = interpolate(capRise, [0, 1], [30, 0]);
  const capOp = interpolate(capLocal, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <Fade d={d}>
      <Cosmic />
      {s.img && s.fg ? <LivingScene img={s.img} fg={s.fg} d={d} dir={idx} /> : s.img ? <KB img={s.img} d={d} dir={idx} /> : null}
      {s.fx ? <Particles fx={s.fx} d={d} seed={idx * 7 + 3} /> : null}
      <GlowPulse accent={accent} />
      <Scrim />
      {aud}
      {s.ref ? (
        <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 100}}>
          <div style={{fontFamily: FONT, fontSize: 28, letterSpacing: 3, color: CREAM, background: 'rgba(16,19,28,0.72)', border: `2px solid ${accent}`, borderRadius: 40, padding: '14px 34px', fontWeight: 700}}>{s.ref}</div>
        </AbsoluteFill>
      ) : null}
      {cap ? (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center'}}>
          <div style={{transform: `translateY(${capY}px)`, opacity: capOp, textAlign: 'center', padding: '0 70px 260px'}}>
            <div style={{fontFamily: FONT, fontSize: 58, fontWeight: 800, lineHeight: 1.22, color: CREAM, textShadow: '0 3px 26px rgba(0,0,0,0.9)'}}>{cap.text}</div>
          </div>
        </AbsoluteFill>
      ) : null}
    </Fade>
  );
};

export const ElementsShort: React.FC<EProps> = ({element, accent, scenes}) => {
  const {durationInFrames} = useVideoConfig();
  const f = useCurrentFrame();
  const acc = accent || ROSE;
  let from = 0;
  const prog = interpolate(f, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: NAVY}}>
      {scenes.map((s, i) => {
        const seq = (
          <Sequence key={i} from={from} durationInFrames={s.frames}>
            <Scene s={s} idx={i} accent={acc} element={element} />
          </Sequence>
        );
        from += s.frames;
        return seq;
      })}
      <AbsoluteFill style={{justifyContent: 'flex-start'}}>
        <div style={{height: 8, width: `${prog * 100}%`, background: acc, opacity: 0.9}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const elementsMetadata = ({props}: {props: EProps}) => ({
  durationInFrames: Math.max(30, props.scenes.reduce((a, b) => a + (b.frames || 30), 0)),
});

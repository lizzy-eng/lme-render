import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// FACELESS LISTICLE — LME's animated numbered-listicle short (zero cost, owned).
// Real motion: parallax Ken Burns on the art, rose number badges that pop in with a
// bounce, headlines that slide up, a scene progress bar, fade-through-black cuts, and a
// title + CTA card. Props-driven; images + per-scene voice live under public/.
//   npx remotion render FacelessListicle out.mp4 --props=spec.json

const ROSE = '#c45670';
const CREAM = '#f5f3f5';
const INK = '#e8e7ea';
const FONT =
  '"Poppins","Helvetica Neue",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

export type FScene = {
  kind: 'title' | 'item' | 'cta';
  number?: number;
  label: string;
  narration?: string;
  img?: string; // filename under public/
  audio?: string; // filename under public/
  frames: number;
};
export type FProps = {
  title: string;
  accent?: string;
  scenes: FScene[];
};

// slow parallax ken burns, direction alternates per scene index
const KenBurns: React.FC<{img: string; d: number; dir: number; face?: boolean}> = ({
  img,
  d,
  dir,
  face,
}) => {
  const frame = useCurrentFrame();
  const t = frame / d;
  const scale = dir % 2 === 0 ? interpolate(t, [0, 1], [1.06, 1.22]) : interpolate(t, [0, 1], [1.2, 1.05]);
  const dx = interpolate(t, [0, 1], [0, dir % 2 === 0 ? -26 : 22]);
  const dy = interpolate(t, [0, 1], [0, -16]);
  return (
    <AbsoluteFill>
      <Img
        src={staticFile(img)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // bias upward so the face shows and any stray hands at the bottom stay off-screen
          objectPosition: face ? 'center 28%' : 'center center',
          transform: `scale(${scale}) translate(${dx}px, ${dy}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Gradients: React.FC = () => (
  <>
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(to top, rgba(10,10,14,0.92) 0%, rgba(10,10,14,0.45) 30%, rgba(10,10,14,0.05) 52%, rgba(10,10,14,0.22) 100%)',
      }}
    />
    <AbsoluteFill
      style={{
        background: 'radial-gradient(125% 90% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)',
      }}
    />
  </>
);

const Scene: React.FC<{s: FScene; idx: number; accent: string}> = ({s, idx, accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = s.frames;
  const fade = Math.min(
    interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(frame, [d - 12, d], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
  );

  if (s.kind === 'title') {
    const rise = spring({frame, fps, config: {damping: 200}});
    const y = interpolate(rise, [0, 1], [60, 0]);
    const op = interpolate(frame, [6, 24], [0, 1], {extrapolateRight: 'clamp'});
    const sweep = interpolate(frame, [16, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return (
      <AbsoluteFill style={{background: '#000', opacity: fade}}>
        {s.img ? <KenBurns img={s.img} d={d} dir={0} face /> : null}
        <Gradients />
        {s.audio ? <Audio src={staticFile(s.audio)} /> : null}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 90px'}}>
          <div style={{transform: `translateY(${y}px)`, opacity: op, textAlign: 'center'}}>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 88,
                fontWeight: 800,
                lineHeight: 1.1,
                color: CREAM,
                textShadow: '0 4px 30px rgba(0,0,0,0.85)',
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                height: 8,
                width: `${sweep * 220}px`,
                background: accent,
                borderRadius: 8,
                margin: '34px auto 0',
              }}
            />
            <div
              style={{
                fontFamily: FONT,
                fontSize: 34,
                letterSpacing: 6,
                textTransform: 'uppercase',
                color: INK,
                marginTop: 30,
                opacity: 0.85,
              }}
            >
              Save this
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (s.kind === 'cta') {
    const pop = spring({frame, fps, config: {damping: 140}});
    const sc = interpolate(pop, [0, 1], [0.8, 1]);
    return (
      <AbsoluteFill style={{background: `linear-gradient(160deg, #201a1d 0%, #3a2a30 100%)`, opacity: fade}}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 96px'}}>
          <div style={{transform: `scale(${sc})`, textAlign: 'center'}}>
            <div style={{width: 90, height: 8, background: accent, borderRadius: 8, margin: '0 auto 40px'}} />
            <div style={{fontFamily: FONT, fontSize: 66, fontWeight: 800, color: CREAM, lineHeight: 1.2}}>
              {s.label}
            </div>
          </div>
        </AbsoluteFill>
        {s.audio ? <Audio src={staticFile(s.audio)} /> : null}
      </AbsoluteFill>
    );
  }

  // numbered item card
  const badge = spring({frame, fps, config: {damping: 12, stiffness: 160, mass: 0.9}});
  const badgeScale = interpolate(badge, [0, 1], [0, 1]);
  const headRise = spring({frame: Math.max(0, frame - 8), fps, config: {damping: 200}});
  const hy = interpolate(headRise, [0, 1], [46, 0]);
  const hop = interpolate(frame, [10, 26], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#000', opacity: fade}}>
      {s.img ? <KenBurns img={s.img} d={d} dir={idx} face /> : null}
      <Gradients />
      {s.audio ? <Audio src={staticFile(s.audio)} /> : null}
      {/* big rose number badge, springs in top-center */}
      <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center'}}>
        <div
          style={{
            marginTop: 120,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${badgeScale})`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{fontFamily: FONT, fontSize: 90, fontWeight: 800, color: CREAM}}>{s.number}</span>
        </div>
      </AbsoluteFill>
      {/* headline slides up */}
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center'}}>
        <div style={{transform: `translateY(${hy}px)`, opacity: hop, textAlign: 'center', padding: '0 76px 230px'}}>
          <div style={{fontFamily: FONT, fontSize: 66, fontWeight: 800, lineHeight: 1.14, color: CREAM, textShadow: '0 3px 22px rgba(0,0,0,0.85)'}}>
            {s.label}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const FacelessListicle: React.FC<FProps> = ({title, accent, scenes}) => {
  const {durationInFrames} = useVideoConfig();
  const frame = useCurrentFrame();
  const acc = accent || ROSE;
  let from = 0;
  const prog = interpolate(frame, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {scenes.map((s, i) => {
        const seq = (
          <Sequence key={i} from={from} durationInFrames={s.frames}>
            <Scene s={s} idx={i} accent={acc} />
          </Sequence>
        );
        from += s.frames;
        return seq;
      })}
      {/* thin scene progress bar across the whole short */}
      <AbsoluteFill style={{justifyContent: 'flex-start'}}>
        <div style={{height: 8, width: `${prog * 100}%`, background: acc, opacity: 0.9}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const facelessMetadata = ({props}: {props: FProps}) => {
  const total = props.scenes.reduce((s, b) => s + (b.frames || 30), 0);
  return {durationInFrames: Math.max(30, total)};
};

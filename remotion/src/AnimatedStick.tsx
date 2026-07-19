import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

// ANIMATED STICK FIGURE — real motion, not a pan. Joint angles are interpolated every
// frame so the character genuinely walks, slumps, breathes, is woken, and rises.
// Deep charcoal grey (never pure black), thick rounded limbs, clean proportions.

const INK = '#3d3a37';

export type StickMode = 'walk' | 'trudge' | 'slump' | 'wake' | 'rise' | 'stand';

type P = {x: number; y: number};
const rad = (d: number) => (d * Math.PI) / 180;
const from = (p: P, angDeg: number, len: number): P => ({
  x: p.x + Math.cos(rad(angDeg)) * len,
  y: p.y + Math.sin(rad(angDeg)) * len,
});

const Limb: React.FC<{a: P; b: P; w: number}> = ({a, b, w}) => (
  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={w} strokeLinecap="round" />
);

export const AnimatedStick: React.FC<{
  mode: StickMode;
  cx?: number;
  groundY?: number;
  scale?: number;
  flip?: boolean;
}> = ({mode, cx = 960, groundY = 880, scale = 1, flip = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // ---- motion state ----
  let hipLift = 0;            // how high the hip sits above the ground
  let torsoLean = -90;        // -90 = perfectly upright
  let headTilt = 0;
  let swing = 0;              // arm/leg swing amplitude
  let cyc = 0;                // gait phase
  let bob = 0;
  let armDrop = 0;

  if (mode === 'walk' || mode === 'trudge') {
    const speed = mode === 'walk' ? 4.6 : 3.0;
    cyc = Math.sin(t * speed);
    swing = mode === 'walk' ? 30 : 20;
    hipLift = 190;
    torsoLean = mode === 'trudge' ? -78 : -86;   // trudge = weary forward lean
    headTilt = mode === 'trudge' ? 22 : 6;
    bob = Math.abs(Math.sin(t * speed)) * -7;
  } else if (mode === 'stand') {
    hipLift = 195;
    bob = Math.sin(t * 1.5) * 3;                 // breathing
    headTilt = 2;
  } else if (mode === 'slump') {
    hipLift = 42;                                // sitting on the ground
    torsoLean = -52;
    headTilt = 34;
    bob = Math.sin(t * 1.05) * 2.5;              // slow exhausted breath
    armDrop = 26;
  } else if (mode === 'wake') {
    // lifts from slump toward sitting upright over ~2.2s
    const k = interpolate(t, [0, 2.2], [0, 1], {extrapolateRight: 'clamp'});
    hipLift = interpolate(k, [0, 1], [42, 70]);
    torsoLean = interpolate(k, [0, 1], [-52, -74]);
    headTilt = interpolate(k, [0, 1], [34, 10]);
    bob = Math.sin(t * 1.4) * 2;
    armDrop = interpolate(k, [0, 1], [26, 8]);
  } else if (mode === 'rise') {
    // stands all the way up and starts to walk on
    const k = interpolate(t, [0, 2.6], [0, 1], {extrapolateRight: 'clamp'});
    hipLift = interpolate(k, [0, 1], [70, 195]);
    torsoLean = interpolate(k, [0, 1], [-74, -88]);
    headTilt = interpolate(k, [0, 1], [10, -2]);
    cyc = Math.sin(t * 4.0) * k;
    swing = 26 * k;
  }

  // ---- skeleton ----
  const hip: P = {x: 0, y: -hipLift + bob};
  const neck: P = from(hip, torsoLean, 128);
  const headC: P = from(neck, torsoLean + headTilt, 52);
  const shoulderL: P = from(neck, torsoLean + 90, 6);
  const shoulderR: P = from(neck, torsoLean - 90, 6);

  const armAngB = -60 + armDrop;
  const elbowL = from(shoulderL, armAngB + swing * cyc + 28, 62);
  const handL = from(elbowL, armAngB + swing * cyc + 52, 60);
  const elbowR = from(shoulderR, armAngB - swing * cyc + 28, 62);
  const handR = from(elbowR, armAngB - swing * cyc + 52, 60);

  const sitting = mode === 'slump' || mode === 'wake';
  const legBase = sitting ? 8 : 88;             // sitting = legs out front
  const kneeL = from(hip, legBase - swing * cyc * 0.7, sitting ? 96 : 84);
  const footL = from(kneeL, sitting ? 2 : 92 - swing * cyc * 0.5, sitting ? 78 : 82);
  const kneeR = from(hip, legBase + swing * cyc * 0.7, sitting ? 74 : 84);
  const footR = from(kneeR, sitting ? 14 : 92 + swing * cyc * 0.5, sitting ? 70 : 82);

  const LW = 15;
  const eyeY = -6;
  const sad = mode === 'slump' || mode === 'trudge' || mode === 'wake';

  return (
    <svg
      viewBox="0 0 1920 1080"
      style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
    >
      <g transform={`translate(${cx} ${groundY}) scale(${(flip ? -scale : scale)} ${scale})`}>
        {/* legs */}
        <Limb a={hip} b={kneeL} w={LW} />
        <Limb a={kneeL} b={footL} w={LW} />
        <Limb a={hip} b={kneeR} w={LW} />
        <Limb a={kneeR} b={footR} w={LW} />
        {/* torso */}
        <Limb a={hip} b={neck} w={LW} />
        {/* arms */}
        <Limb a={shoulderL} b={elbowL} w={LW} />
        <Limb a={elbowL} b={handL} w={LW} />
        <Limb a={shoulderR} b={elbowR} w={LW} />
        <Limb a={elbowR} b={handR} w={LW} />
        {/* head + simple ancient head covering */}
        <circle cx={headC.x} cy={headC.y} r={46} fill="#fff" stroke={INK} strokeWidth={LW - 3} />
        <path
          d={`M ${headC.x - 48} ${headC.y - 6} a 48 46 0 0 1 96 0 q -48 -26 -96 0 z`}
          fill={INK}
          opacity={0.85}
        />
        {/* eyes */}
        <circle cx={headC.x - 15} cy={headC.y + eyeY} r={5.5} fill={INK} />
        <circle cx={headC.x + 15} cy={headC.y + eyeY} r={5.5} fill={INK} />
        {/* mouth */}
        {sad ? (
          <path
            d={`M ${headC.x - 15} ${headC.y + 26} q 15 -12 30 0`}
            fill="none"
            stroke={INK}
            strokeWidth={5}
            strokeLinecap="round"
          />
        ) : (
          <path
            d={`M ${headC.x - 15} ${headC.y + 18} q 15 14 30 0`}
            fill="none"
            stroke={INK}
            strokeWidth={5}
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
};

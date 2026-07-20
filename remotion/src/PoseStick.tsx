import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// POSE STICK — the LOCKED, AI-GENERATED Elijah stickman (Canva pose sheet, sliced).
// RULE 1 of STICKMAN DONE RIGHT: the character is generated art, never hand-drawn.
// Real motion = classic limited animation: pose phases of the SAME locked character
// cycle on a stepped clock, plus traversal across the frame for walks.
// Story cells (angel touching the sleeper, eating the bread, the glowing provision)
// are AI-generated in the same style so the picture always matches the narration.
// Sprites live in public/elijah_poses/.

export type StickMode = 'walk' | 'trudge' | 'slump' | 'wake' | 'rise' | 'stand' | 'angel' | 'eat';

// pose index sets per motion, from the locked sheet:
// 0,1,2,7 = weary walk phases; 3,4 = slumped; 5,6 = lying asleep / bowed; 8 = rising; 9 = standing tall.
const SETS: Record<string, number[]> = {
  walk: [0, 1, 2, 7],
  trudge: [0, 1, 2, 7],
  slump: [3, 4],
  wake: [5, 6],
  rise: [6, 8, 9],
  stand: [9],
};

const HOLD: Record<string, number> = {
  walk: 7, trudge: 9, slump: 26, wake: 30, rise: 34, stand: 1,
};

// The sheet's walk poses 0,1,2 face LEFT; traversal moves RIGHT. Mirror them so the
// character always faces the direction he is walking (the "head backward" fix).
const FLIP: Record<number, boolean> = {0: true, 1: true, 2: true};

export const PoseStick: React.FC<{
  mode: StickMode;
  d: number;            // scene duration in frames
  groundY?: number;     // horizon line y in px (1080 canvas)
  height?: number;      // figure height in px
}> = ({mode, d, groundY = 845, height = 400}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ---- story cells: full AI vignettes with their own gentle life ----
  if (mode === 'angel' || mode === 'eat') {
    const float = Math.sin((frame / fps) * 1.7) * 6;          // soft heavenly float
    const rock = mode === 'eat' ? Math.sin((frame / fps) * 2.6) * 2.2 : 0; // eating rock
    const breathe = 1 + Math.sin((frame / fps) * 1.2) * 0.012;
    const src = mode === 'angel' ? 'elijah_poses/angel.png' : 'elijah_poses/eat.png';
    const h = mode === 'angel' ? 330 : 360;
    return (
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute',
          left: 820,
          bottom: 1080 - groundY,
          height: h * breathe,
          transform: `translateX(-50%) translateY(${mode === 'angel' ? float : 0}px) rotate(${rock}deg)`,
          transformOrigin: 'bottom center',
        }}
      />
    );
  }

  const set = SETS[mode];
  const step = Math.floor(frame / HOLD[mode]);
  const pose = mode === 'rise' ? set[Math.min(set.length - 1, step)] : set[step % set.length];

  const walking = mode === 'walk' || mode === 'trudge';
  const x = walking ? interpolate(frame, [0, Math.max(1, d)], [520, 1120]) : 820;
  const bob = Math.sin((frame / fps) * (walking ? 6 : 1.6)) * (walking ? 5 : 3);
  const sc = mode === 'stand' ? 1 + Math.sin((frame / fps) * 1.5) * 0.012 : 1;
  const flip = FLIP[pose] ? -1 : 1;

  return (
    <Img
      src={staticFile(`elijah_poses/pose${pose}.png`)}
      style={{
        position: 'absolute',
        left: x,
        bottom: 1080 - groundY,
        height: height * sc,
        transform: `translateX(-50%) translateY(${bob}px) scaleX(${flip})`,
        transformOrigin: 'bottom center',
      }}
    />
  );
};

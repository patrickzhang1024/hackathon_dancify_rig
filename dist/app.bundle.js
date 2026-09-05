// Built by rig/build.ps1 鈥?do not edit. Concatenation of rig/src in load order.

/* ---- config/constants.js ---- */
// Config + taxonomies + body-state machine (Theme 3).
// Pure JS, no THREE dependency, so it can run in a browser or Node.
window.DANCE = window.DANCE || {};

DANCE.constants = (function () {
  const BODY_STATES = ['STAND', 'SIT', 'FLOOR', 'AIR'];

  // Legal state transitions -> transition clip id.
  // STAND<->SIT, STAND<->FLOOR, SIT<->FLOOR, STAND->AIR->STAND (jump only).
  const TRANSITIONS = {
    'STAND->SIT': 'tr_stand_sit',
    'SIT->STAND': 'tr_sit_stand',
    'STAND->FLOOR': 'tr_stand_floor',
    'FLOOR->STAND': 'tr_floor_stand',
    'SIT->FLOOR': 'tr_sit_floor',
    'FLOOR->SIT': 'tr_floor_sit',
    'STAND->AIR': 'tr_jump_up',
    'AIR->STAND': 'tr_jump_land'
  };

  // genre -> dance_genre subset (from feasibility.md).
  const GENRE_TO_DANCE = {
    pop: ['commercial_kpop', 'jazz_funk'],
    kpop: ['commercial_kpop', 'jazz_funk'],
    hiphop: ['street_hiphop', 'popping'],
    rap: ['street_hiphop', 'popping'],
    trap: ['street_hiphop', 'popping'],
    edm: ['shuffle', 'house_dance'],
    house: ['shuffle', 'house_dance'],
    rnb: ['contemporary', 'lyrical'],
    ballad: ['contemporary', 'lyrical'],
    latin: ['freestyle'],
    rock: ['freestyle'],
    classical: ['contemporary']
  };

  // Demo song structure. Stands in for Theme 1's CriteriaReport output so the
  // release test runs without audio analysis. bpm + labelled sections.
  const DEMO_SONG = {
    title: 'Demo Track (120 BPM)',
    bpm: 120,
    beatsPerBar: 4,
    sections: [
      { label: 'intro', bars: 4, energy: 'low' },
      { label: 'verse', bars: 8, energy: 'medium' },
      { label: 'chorus', bars: 8, energy: 'high' },
      { label: 'verse', bars: 8, energy: 'medium' },
      { label: 'chorus', bars: 8, energy: 'high' },
      { label: 'bridge', bars: 4, energy: 'medium' },
      { label: 'chorus', bars: 8, energy: 'high' },
      { label: 'outro', bars: 4, energy: 'low' }
    ]
  };

  const DANCE_GENRES = [
    'street_hiphop', 'popping', 'house_dance', 'shuffle',
    'jazz_funk', 'commercial_kpop', 'contemporary', 'lyrical', 'freestyle'
  ];

  return { BODY_STATES, TRANSITIONS, GENRE_TO_DANCE, DEMO_SONG, DANCE_GENRES };
})();


/* ---- render/moves.js ---- */
// Move library for Theme 3.
// Each clip is a PROCEDURAL pose function (no external Mixamo assets needed),
// so the release test is fully self-contained and offline.
// ponytail: procedural rig instead of Mixamo glTF clips for a zero-asset release
// build; swap clip.apply for GLTFLoader AnimationActions later (script format is
// identical). Only Math is used here so this file is portable to Node.
window.DANCE = window.DANCE || {};

DANCE.moves = (function () {
  const PI = Math.PI;
  const TAU = PI * 2;
  const DEG = PI / 180;

  // Joints animated by poses. hips also carries position offsets (px,py,pz).
  const JOINTS = [
    'hips', 'spine', 'chest', 'head',
    'armL', 'forearmL', 'armR', 'forearmR',
    'legL', 'shinL', 'legR', 'shinR'
  ];

  function basePose() {
    const p = {};
    for (const j of JOINTS) p[j] = { rx: 0, ry: 0, rz: 0 };
    p.hips.px = 0; p.hips.py = 0; p.hips.pz = 0;
    return p;
  }

  // Oscillators (beat-based, so motion is inherently beat-locked).
  const beatPulse = (beat) => (1 + Math.cos(beat * TAU)) / 2; // 1 on the beat, 0 off-beat
  const sway = (beat, cyc = 1) => Math.sin(beat * TAU * cyc);

  // Gain from performance params.
  const gain = (ctx) => (ctx.intensity ?? 1) * (ctx.amp ?? 1);
  const mir = (ctx) => (ctx.mirror ? -1 : 1);

  // ---- STAND dance moves --------------------------------------------------
  const idle = (pose, ctx) => {
    const g = gain(ctx);
    pose.hips.ry = sway(ctx.beat, 0.25) * 0.04 * g;
    pose.spine.rx = 0.03 + Math.sin(ctx.beat * PI) * 0.02;
    pose.armL.rz = 0.12; pose.armR.rz = -0.12;
    pose.armL.rx = sway(ctx.beat, 0.25) * 0.05;
    pose.armR.rx = -sway(ctx.beat, 0.25) * 0.05;
  };

  const bounce = (pose, ctx) => {
    const g = gain(ctx), dip = beatPulse(ctx.beat);
    pose.hips.py = -0.09 * dip * g;
    pose.legL.rx = 0.30 * dip; pose.legR.rx = 0.30 * dip;
    pose.shinL.rx = -0.55 * dip; pose.shinR.rx = -0.55 * dip;
    pose.armL.rx = -0.35 * dip * g; pose.armR.rx = -0.35 * dip * g;
    pose.armL.rz = 0.15; pose.armR.rz = -0.15;
    pose.chest.ry = sway(ctx.beat, 0.5) * 0.15 * mir(ctx);
  };

  const step_touch = (pose, ctx) => {
    const g = gain(ctx), s = sway(ctx.beat, 0.5) * mir(ctx);
    pose.hips.px = s * 0.14 * g;
    pose.hips.ry = s * 0.10;
    pose.chest.rz = -s * 0.08;
    pose.armL.rx = -0.5 - s * 0.4 * g; pose.armR.rx = -0.5 + s * 0.4 * g;
    pose.armL.rz = 0.2; pose.armR.rz = -0.2;
    pose.forearmL.rx = -0.5; pose.forearmR.rx = -0.5;
  };

  const arm_pump = (pose, ctx) => {
    const g = gain(ctx), dip = beatPulse(ctx.beat);
    pose.hips.py = -0.05 * dip;
    pose.armL.rx = -2.4 + 0.5 * dip; pose.armR.rx = -2.4 + 0.5 * dip;
    pose.armL.rz = 0.25; pose.armR.rz = -0.25;
    pose.forearmL.rx = -1.6 * (1 - dip) * g; pose.forearmR.rx = -1.6 * (1 - dip) * g;
    pose.chest.rx = -0.05;
  };

  const clap = (pose, ctx) => {
    const g = gain(ctx), dip = beatPulse(ctx.beat);
    pose.armL.rx = -1.3; pose.armR.rx = -1.3;
    pose.armL.rz = 0.55 - 0.45 * dip * g; pose.armR.rz = -0.55 + 0.45 * dip * g;
    pose.forearmL.rx = -0.5; pose.forearmR.rx = -0.5;
    pose.hips.py = -0.04 * dip;
    pose.chest.rx = -0.06;
  };

  const wave_hands = (pose, ctx) => {
    const g = gain(ctx), s = sway(ctx.beat, 0.5);
    pose.armL.rx = -2.7; pose.armR.rx = -2.7;
    pose.armL.rz = 0.5 + s * 0.25 * g; pose.armR.rz = -0.5 + s * 0.25 * g;
    pose.chest.rz = s * 0.12 * g;
    pose.hips.px = s * 0.06;
    pose.hips.py = -0.03 * beatPulse(ctx.beat);
  };

  const twist = (pose, ctx) => {
    const g = gain(ctx), s = sway(ctx.beat, 0.5) * mir(ctx);
    pose.chest.ry = s * 0.5 * g;
    pose.hips.ry = -s * 0.25;
    pose.armL.rx = -0.6; pose.armR.rx = -0.6;
    pose.armL.rz = 0.4; pose.armR.rz = -0.4;
    pose.forearmL.rx = -1.0; pose.forearmR.rx = -1.0;
    pose.hips.py = -0.03 * beatPulse(ctx.beat);
  };

  const point_up = (pose, ctx) => {
    const g = gain(ctx), dip = beatPulse(ctx.beat), s = mir(ctx);
    pose.hips.py = -0.05 * dip;
    // one arm points up diagonally, other on hip
    pose.armR.rx = -2.6 * (s > 0 ? 1 : 0.2); pose.armR.rz = -0.3;
    pose.armL.rx = -2.6 * (s > 0 ? 0.2 : 1); pose.armL.rz = 0.3;
    pose.chest.ry = s * 0.2;
    pose.hips.ry = s * 0.1;
  };

  const spin = (pose, ctx) => {
    const g = gain(ctx);
    pose.hips.ry = ctx.t01 * TAU * mir(ctx); // full 360 across the clip
    pose.armL.rx = -1.4; pose.armR.rx = -1.4;
    pose.armL.rz = 0.7; pose.armR.rz = -0.7;
    pose.hips.py = -0.04 * beatPulse(ctx.beat);
  };

  // ---- SIT dance moves ----------------------------------------------------
  const sitBase = (pose) => {
    pose.hips.py = -0.5;
    pose.legL.rx = -1.5; pose.legR.rx = -1.5;
    pose.shinL.rx = 1.4; pose.shinR.rx = 1.4;
    pose.legL.rz = 0.15; pose.legR.rz = -0.15;
    pose.spine.rx = 0.05;
  };
  const sit_sway = (pose, ctx) => {
    sitBase(pose);
    const s = sway(ctx.beat, 0.5) * mir(ctx);
    pose.chest.rz = s * 0.2; pose.chest.ry = s * 0.15;
    pose.armL.rx = -0.4 - s * 0.3; pose.armR.rx = -0.4 + s * 0.3;
    pose.armL.rz = 0.3; pose.armR.rz = -0.3;
  };
  const sit_clap = (pose, ctx) => {
    sitBase(pose);
    const dip = beatPulse(ctx.beat);
    pose.armL.rx = -1.1; pose.armR.rx = -1.1;
    pose.armL.rz = 0.5 - 0.4 * dip; pose.armR.rz = -0.5 + 0.4 * dip;
    pose.forearmL.rx = -0.5; pose.forearmR.rx = -0.5;
    pose.chest.rx = -0.05 * dip;
  };

  // ---- FLOOR dance moves --------------------------------------------------
  const floorBase = (pose) => {
    pose.hips.py = -0.78;
    pose.spine.rx = -0.5; pose.chest.rx = -0.3;
    pose.legL.rx = -1.2; pose.legR.rx = -1.2;
    pose.shinL.rx = 1.6; pose.shinR.rx = 1.6;
    pose.legL.rz = 0.35; pose.legR.rz = -0.35;
  };
  const floor_pose = (pose, ctx) => {
    floorBase(pose);
    const s = sway(ctx.beat, 0.25);
    pose.armR.rx = -1.4; pose.armR.rz = -0.4; // prop
    pose.armL.rx = -1.9; pose.armL.rz = 0.6 + s * 0.2;
    pose.chest.ry = s * 0.2;
  };
  const floor_wave = (pose, ctx) => {
    floorBase(pose);
    const s = sway(ctx.beat, 0.5);
    pose.armL.rx = -2.0 + s * 0.3; pose.armR.rx = -2.0 - s * 0.3;
    pose.armL.rz = 0.6; pose.armR.rz = -0.6;
    pose.head.rz = s * 0.15;
  };

  // ---- AIR (reached only via jump transition) -----------------------------
  const air_tuck = (pose, ctx) => {
    pose.hips.py = 0.5;
    pose.legL.rx = 0.9; pose.legR.rx = 0.9;
    pose.shinL.rx = -1.4; pose.shinR.rx = -1.4;
    pose.armL.rx = -2.4; pose.armR.rx = -2.4;
    pose.armL.rz = 0.4; pose.armR.rz = -0.4;
  };

  // ---- Transition clips (drive the state machine) -------------------------
  const lerp = (a, b, t) => a + (b - a) * t;

  const tr_stand_sit = (pose, ctx) => {
    const t = ctx.t01;
    pose.hips.py = lerp(0, -0.5, t);
    pose.legL.rx = lerp(0, -1.5, t); pose.legR.rx = lerp(0, -1.5, t);
    pose.shinL.rx = lerp(0, 1.4, t); pose.shinR.rx = lerp(0, 1.4, t);
    pose.legL.rz = 0.15 * t; pose.legR.rz = -0.15 * t;
  };
  const tr_sit_stand = (pose, ctx) => tr_stand_sit(pose, { t01: 1 - ctx.t01 });

  const tr_stand_floor = (pose, ctx) => {
    const t = ctx.t01;
    pose.hips.py = lerp(0, -0.78, t);
    pose.spine.rx = lerp(0, -0.5, t); pose.chest.rx = lerp(0, -0.3, t);
    pose.legL.rx = lerp(0, -1.2, t); pose.legR.rx = lerp(0, -1.2, t);
    pose.shinL.rx = lerp(0, 1.6, t); pose.shinR.rx = lerp(0, 1.6, t);
    pose.legL.rz = 0.35 * t; pose.legR.rz = -0.35 * t;
  };
  const tr_floor_stand = (pose, ctx) => tr_stand_floor(pose, { t01: 1 - ctx.t01 });

  const tr_sit_floor = (pose, ctx) => {
    const t = ctx.t01;
    pose.hips.py = lerp(-0.5, -0.78, t);
    pose.spine.rx = lerp(0, -0.5, t); pose.chest.rx = lerp(0, -0.3, t);
    pose.legL.rx = lerp(-1.5, -1.2, t); pose.legR.rx = lerp(-1.5, -1.2, t);
    pose.shinL.rx = lerp(1.4, 1.6, t); pose.shinR.rx = lerp(1.4, 1.6, t);
    pose.legL.rz = lerp(0.15, 0.35, t); pose.legR.rz = lerp(-0.15, -0.35, t);
  };
  const tr_floor_sit = (pose, ctx) => tr_sit_floor(pose, { t01: 1 - ctx.t01 });

  const tr_jump_up = (pose, ctx) => {
    const t = ctx.t01;
    // crouch then launch
    const crouch = t < 0.35 ? (t / 0.35) : (1 - (t - 0.35) / 0.65);
    pose.hips.py = t < 0.35 ? lerp(0, -0.18, t / 0.35) : lerp(-0.18, 0.5, (t - 0.35) / 0.65);
    pose.legL.rx = 0.5 * crouch; pose.legR.rx = 0.5 * crouch;
    pose.shinL.rx = -0.9 * crouch; pose.shinR.rx = -0.9 * crouch;
    pose.armL.rx = lerp(0, -2.2, t); pose.armR.rx = lerp(0, -2.2, t);
    pose.armL.rz = 0.3; pose.armR.rz = -0.3;
  };
  const tr_jump_land = (pose, ctx) => {
    const t = ctx.t01;
    // fall then absorb
    pose.hips.py = t < 0.5 ? lerp(0.5, -0.2, t / 0.5) : lerp(-0.2, 0, (t - 0.5) / 0.5);
    const absorb = t < 0.5 ? 0.2 : (1 - (t - 0.5) / 0.5);
    pose.legL.rx = 0.6 * absorb; pose.legR.rx = 0.6 * absorb;
    pose.shinL.rx = -1.1 * absorb; pose.shinR.rx = -1.1 * absorb;
    pose.armL.rx = lerp(-2.2, 0, t); pose.armR.rx = lerp(-2.2, 0, t);
    pose.armL.rz = 0.2; pose.armR.rz = -0.2;
  };

  // ---- Library ------------------------------------------------------------
  const list = [
    // STAND dance
    { id: 'idle', name: 'Idle Sway', type: 'idle', bodyState: 'STAND', energy: 'low', beats: 4, genres: ['all'], apply: idle },
    { id: 'bounce', name: 'Two-Step Bounce', type: 'dance', bodyState: 'STAND', energy: 'medium', beats: 2, genres: ['all'], apply: bounce },
    { id: 'step_touch', name: 'Step Touch', type: 'dance', bodyState: 'STAND', energy: 'medium', beats: 2, genres: ['all', 'commercial_kpop', 'jazz_funk'], apply: step_touch },
    { id: 'arm_pump', name: 'Arm Pump', type: 'dance', bodyState: 'STAND', energy: 'high', beats: 2, genres: ['shuffle', 'house_dance', 'all'], apply: arm_pump },
    { id: 'clap', name: 'Clap Groove', type: 'dance', bodyState: 'STAND', energy: 'medium', beats: 2, genres: ['all'], apply: clap },
    { id: 'wave_hands', name: 'Hands Up', type: 'dance', bodyState: 'STAND', energy: 'high', beats: 4, genres: ['commercial_kpop', 'all'], apply: wave_hands },
    { id: 'twist', name: 'Body Twist', type: 'dance', bodyState: 'STAND', energy: 'medium', beats: 2, genres: ['popping', 'street_hiphop', 'all'], apply: twist },
    { id: 'point_up', name: 'Disco Point', type: 'dance', bodyState: 'STAND', energy: 'high', beats: 2, genres: ['jazz_funk', 'all'], apply: point_up },
    { id: 'spin', name: 'Full Spin', type: 'dance', bodyState: 'STAND', energy: 'high', beats: 2, genres: ['contemporary', 'freestyle', 'all'], apply: spin },
    // SIT dance
    { id: 'sit_sway', name: 'Seated Sway', type: 'dance', bodyState: 'SIT', energy: 'low', beats: 4, genres: ['all'], apply: sit_sway },
    { id: 'sit_clap', name: 'Seated Clap', type: 'dance', bodyState: 'SIT', energy: 'medium', beats: 2, genres: ['all'], apply: sit_clap },
    // FLOOR dance
    { id: 'floor_pose', name: 'Floor Prop', type: 'dance', bodyState: 'FLOOR', energy: 'low', beats: 4, genres: ['contemporary', 'lyrical', 'all'], apply: floor_pose },
    { id: 'floor_wave', name: 'Floor Wave', type: 'dance', bodyState: 'FLOOR', energy: 'medium', beats: 4, genres: ['contemporary', 'all'], apply: floor_wave },
    // AIR dance (short, mid-jump)
    { id: 'air_tuck', name: 'Air Tuck', type: 'dance', bodyState: 'AIR', energy: 'high', beats: 1, genres: ['all'], apply: air_tuck },
    // Transitions
    { id: 'tr_stand_sit', name: 'Sit Down', type: 'transition', bodyState: 'SIT', fromState: 'STAND', toState: 'SIT', energy: 'low', beats: 2, genres: ['all'], apply: tr_stand_sit },
    { id: 'tr_sit_stand', name: 'Stand Up', type: 'transition', bodyState: 'STAND', fromState: 'SIT', toState: 'STAND', energy: 'low', beats: 2, genres: ['all'], apply: tr_sit_stand },
    { id: 'tr_stand_floor', name: 'To Floor', type: 'transition', bodyState: 'FLOOR', fromState: 'STAND', toState: 'FLOOR', energy: 'low', beats: 2, genres: ['all'], apply: tr_stand_floor },
    { id: 'tr_floor_stand', name: 'Off Floor', type: 'transition', bodyState: 'STAND', fromState: 'FLOOR', toState: 'STAND', energy: 'low', beats: 2, genres: ['all'], apply: tr_floor_stand },
    { id: 'tr_sit_floor', name: 'Sit To Floor', type: 'transition', bodyState: 'FLOOR', fromState: 'SIT', toState: 'FLOOR', energy: 'low', beats: 2, genres: ['all'], apply: tr_sit_floor },
    { id: 'tr_floor_sit', name: 'Floor To Sit', type: 'transition', bodyState: 'SIT', fromState: 'FLOOR', toState: 'SIT', energy: 'low', beats: 2, genres: ['all'], apply: tr_floor_sit },
    { id: 'tr_jump_up', name: 'Jump Up', type: 'transition', bodyState: 'AIR', fromState: 'STAND', toState: 'AIR', energy: 'high', beats: 1, genres: ['all'], apply: tr_jump_up },
    { id: 'tr_jump_land', name: 'Land', type: 'transition', bodyState: 'STAND', fromState: 'AIR', toState: 'STAND', energy: 'high', beats: 1, genres: ['all'], apply: tr_jump_land }
  ];

  const byId = {};
  for (const m of list) byId[m.id] = m;

  return { JOINTS, basePose, list, byId, get: (id) => byId[id] };
})();


/* ---- agent/seeds.js ---- */
// Random seeds -> deterministic CreativeBrief (feasibility S4).
// crypto RNG for the seed strings; deterministic hash PRNG for the brief so the
// same seed always yields the same choreography.
window.DANCE = window.DANCE || {};

DANCE.seeds = (function () {
  // Cryptographically-random short strings.
  function randomStrings(n) {
    const out = [];
    const buf = new Uint32Array(2);
    for (let i = 0; i < n; i++) {
      crypto.getRandomValues(buf);
      out.push((buf[0].toString(36) + buf[1].toString(36)).slice(0, 10));
    }
    return out;
  }

  // xmur3 string hash -> 32-bit seed generator.
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  // mulberry32 PRNG -> floats in [0,1).
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  // Deterministic seed string -> CreativeBrief.
  function seedToBrief(seed) {
    const C = DANCE.constants;
    const seeder = xmur3(seed);
    const rng = mulberry32(seeder());
    const energyLevels = ['calm', 'medium', 'hype'];
    const spatials = ['centered', 'traveling', 'expansive'];
    const complexities = ['simple', 'moderate', 'busy'];

    const dance_genre = pick(rng, C.DANCE_GENRES);
    const energy_bias = pick(rng, energyLevels);
    const spatial_style = pick(rng, spatials);
    const complexity = pick(rng, complexities);
    // 0 = mostly standing, 1 = frequent sit/floor/jump excursions.
    const body_state_bias = Math.round(rng() * 100) / 100;

    return {
      seed,
      dance_genre,
      energy_bias,
      complexity,
      spatial_style,
      body_state_bias,
      signature_moves: [],
      rngSeed: seeder() // stable int seed for the choreographer's PRNG
    };
  }

  return { randomStrings, xmur3, mulberry32, seedToBrief };
})();


/* ---- agent/choreographer.js ---- */
// Deterministic local choreographer (Theme 3 release test).
// Turns a CreativeBrief + song structure into a MotionControlScript JSON, with a
// legal body-state machine (every state change bridged by a transition clip).
// ponytail: local deterministic composer stands in for the Theme 2 LLM call so
// the release test needs no API key; the output JSON schema is identical.
window.DANCE = window.DANCE || {};

DANCE.choreographer = (function () {
  // Finger gesture per move id (the VRM rig articulates fingers; the primitive
  // fallback ignores this). Default 'relaxed'.
  const HANDS = {
    idle: 'relaxed', bounce: 'relaxed', step_touch: 'relaxed',
    arm_pump: 'fist', clap: 'open', wave_hands: 'open',
    twist: 'relaxed', point_up: 'point', spin: 'open',
    sit_sway: 'relaxed', sit_clap: 'open',
    floor_pose: 'open', floor_wave: 'open', air_tuck: 'fist'
  };

  const pickWeighted = (rng, items, weightOf) => {
    let total = 0;
    for (const it of items) total += Math.max(0, weightOf(it));
    if (total <= 0) return items[Math.floor(rng() * items.length)];
    let r = rng() * total;
    for (const it of items) {
      r -= Math.max(0, weightOf(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  };

  function danceMovesFor(state, brief) {
    const all = DANCE.moves.list.filter(
      (m) => (m.type === 'dance' || m.type === 'idle') && m.bodyState === state
    );
    const matched = all.filter(
      (m) => m.genres.includes('all') || m.genres.includes(brief.dance_genre)
    );
    return matched.length ? matched : all;
  }

  const energyRank = { low: 0, medium: 1, high: 2 };
  const biasRank = { calm: 0, medium: 1, hype: 2 };

  function moveWeight(move, sectionEnergy, brief) {
    // Prefer moves whose energy matches the section + the brief's energy bias.
    const target = (energyRank[sectionEnergy] + biasRank[brief.energy_bias]) / 2;
    const d = Math.abs(energyRank[move.energy] - target);
    return 1 / (1 + d);
  }

  // Build a state "excursion" (STAND -> target -> STAND) that fits the budget.
  function buildExcursion(target, remaining, absBeat, brief, rng) {
    const C = DANCE.constants;
    const trIn = DANCE.moves.get(C.TRANSITIONS['STAND->' + target]);
    const trOut = DANCE.moves.get(C.TRANSITIONS[target + '->STAND']);
    if (!trIn || !trOut) return null;
    const danceOpts = danceMovesFor(target, brief);
    if (!danceOpts.length) return null;
    const dance = danceOpts[Math.floor(rng() * danceOpts.length)];
    const cost = trIn.beats + dance.beats + trOut.beats;
    if (cost > remaining) return null;

    const seq = [];
    let b = absBeat;
    for (const clip of [trIn, dance, trOut]) {
      seq.push(makeInstance(clip, b, clip.beats, brief, rng));
      b += clip.beats;
    }
    return seq;
  }

  function makeInstance(clip, startBeat, durationBeats, brief, rng) {
    const facing = brief.spatial_style === 'expansive' ? Math.round((rng() - 0.5) * 60) : 0;
    const travel = brief.spatial_style === 'traveling' ? Math.round((rng() - 0.5) * 100) / 100 : 0;
    return {
      clipId: clip.id,
      name: clip.name,
      startBeat,
      durationBeats,
      bodyState: clip.bodyState,
      intensity: Math.round((0.7 + rng() * 0.4) * 100) / 100,
      ampScale: Math.round((0.85 + rng() * 0.35) * 100) / 100,
      facingDeg: facing,
      mirror: rng() < 0.5 ? 1 : 0,
      travel,
      hands: HANDS[clip.id] || 'relaxed'
    };
  }

  function compose(brief, song) {
    const C = DANCE.constants;
    const rng = DANCE.seeds.mulberry32(brief.rngSeed >>> 0);
    const timeline = [];
    let absBeat = 0;

    // Excursion probability grows with body_state_bias; complexity shortens moves.
    const excursionP = 0.12 + brief.body_state_bias * 0.35;

    for (const section of song.sections) {
      const sectionBeats = section.bars * song.beatsPerBar;
      const sectionEnd = absBeat + sectionBeats;
      const moves = [];
      let state = 'STAND';

      while (absBeat < sectionEnd) {
        const remaining = sectionEnd - absBeat;

        // Try a state excursion only from STAND, and only if it fits with room
        // to also return before the section ends.
        if (state === 'STAND' && remaining >= 5 && rng() < excursionP) {
          const targets = ['SIT', 'FLOOR', 'AIR'];
          const target = targets[Math.floor(rng() * targets.length)];
          const seq = buildExcursion(target, remaining, absBeat, brief, rng);
          if (seq) {
            for (const inst of seq) moves.push(inst);
            absBeat = seq[seq.length - 1].startBeat + seq[seq.length - 1].durationBeats;
            continue;
          }
        }

        // Otherwise place a STAND dance move (tiled, clamped to section end).
        const opts = danceMovesFor('STAND', brief);
        const move = pickWeighted(rng, opts, (m) => moveWeight(m, section.energy, brief));
        const dur = Math.min(move.beats, remaining);
        if (dur < 1) break; // sub-beat remainder: leave (should not happen with even bars)
        moves.push(makeInstance(move, absBeat, dur, brief, rng));
        absBeat += dur;
      }

      timeline.push({
        sectionLabel: section.label,
        energy: section.energy,
        startBeat: sectionEnd - sectionBeats,
        endBeat: absBeat,
        moves
      });
    }

    return {
      seed: brief.seed,
      brief,
      title: song.title,
      bpm: song.bpm,
      beatsPerBar: song.beatsPerBar,
      beatGrid: 'quarter',
      totalBeats: absBeat,
      timeline
    };
  }

  // Validate: contiguity (no gaps/overlaps), clip existence, and a legal
  // body-state machine ending back at STAND.
  function validate(script) {
    const errors = [];
    let expected = 0;
    let state = 'STAND';
    const flat = script.timeline.flatMap((s) => s.moves);

    if (flat.length === 0) errors.push('empty timeline');

    for (const m of flat) {
      const clip = DANCE.moves.get(m.clipId);
      if (!clip) { errors.push(`unknown clip ${m.clipId}`); continue; }
      if (Math.abs(m.startBeat - expected) > 1e-6) {
        errors.push(`gap/overlap at beat ${m.startBeat} (expected ${expected})`);
      }
      if (clip.type === 'transition') {
        if (clip.fromState !== state) {
          errors.push(`illegal transition ${clip.id}: ${state}->${clip.toState}`);
        }
        state = clip.toState;
      } else if (clip.bodyState !== state) {
        errors.push(`move ${clip.id} needs state ${clip.bodyState} but body is ${state}`);
      }
      expected = m.startBeat + m.durationBeats;
    }

    if (Math.abs(expected - script.totalBeats) > 1e-6) {
      errors.push(`ends at ${expected}, expected total ${script.totalBeats}`);
    }
    if (state !== 'STAND') errors.push(`ends in state ${state}, expected STAND`);

    return { ok: errors.length === 0, errors };
  }

  return { compose, validate };
})();


/* ---- render/rigLimits.js ---- */
// Anatomical joint limits — the anti-反关节 (reverse-joint) safety net.
// Operates on the plain pose object {joint:{rx,ry,rz}} BEFORE it is retargeted
// onto the VRM humanoid, so it stays THREE-free and unit-testable.
//
// Ranges are intentionally generous: they contain every angle the authored moves
// produce, and only bite when intensity/amp scaling, facing offsets or crossfade
// blending push a joint past a plausible human range (which is exactly when a
// knee or elbow would otherwise visibly invert).
window.DANCE = window.DANCE || {};

DANCE.rigLimits = (function () {
  // [min, max] radians per axis, in the primitive rig convention
  // (all limbs rest along -Y, joint frames world-aligned).
  const L = {
    hips:      { rx: [-0.6, 0.6],  ry: [-Math.PI, Math.PI], rz: [-0.5, 0.5] }, // ry free: facing + spin
    spine:     { rx: [-0.5, 0.7],  ry: [-0.6, 0.6],  rz: [-0.4, 0.4] },
    chest:     { rx: [-0.4, 0.5],  ry: [-0.75, 0.75], rz: [-0.4, 0.4] },
    head:      { rx: [-0.5, 0.5],  ry: [-0.85, 0.85], rz: [-0.5, 0.5] },
    // Shoulders: wide cone. Left/right mirror the rz (abduction) range.
    armL:      { rx: [-2.95, 0.9], ry: [-1.3, 1.3],  rz: [-0.35, 1.9] },
    armR:      { rx: [-2.95, 0.9], ry: [-1.3, 1.3],  rz: [-1.9, 0.35] },
    // Elbows: hinge. Cannot hyperextend past straight (small +epsilon only).
    forearmL:  { rx: [-2.7, 0.08], ry: [-1.3, 1.3],  rz: [-0.4, 0.4] },
    forearmR:  { rx: [-2.7, 0.08], ry: [-1.3, 1.3],  rz: [-0.4, 0.4] },
    // Hips (thighs): flexion big, abduction moderate.
    legL:      { rx: [-1.9, 1.3],  ry: [-0.6, 0.6],  rz: [-0.5, 0.6] },
    legR:      { rx: [-1.9, 1.3],  ry: [-0.6, 0.6],  rz: [-0.6, 0.5] },
    // Knees: hinge. Allow deep flex (sit/floor/tuck) but no reverse bend.
    shinL:     { rx: [-1.7, 2.0],  ry: [-0.4, 0.4],  rz: [-0.35, 0.35] },
    shinR:     { rx: [-1.7, 2.0],  ry: [-0.4, 0.4],  rz: [-0.35, 0.35] }
  };

  const clampVal = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // Mutates pose in place; returns it. hips position offsets are left untouched.
  function clamp(pose) {
    for (const name in L) {
      const p = pose[name];
      if (!p) continue;
      const lim = L[name];
      if (typeof p.rx === 'number') p.rx = clampVal(p.rx, lim.rx[0], lim.rx[1]);
      if (typeof p.ry === 'number') p.ry = clampVal(p.ry, lim.ry[0], lim.ry[1]);
      if (typeof p.rz === 'number') p.rz = clampVal(p.rz, lim.rz[0], lim.rz[1]);
    }
    return pose;
  }

  return { clamp, limits: L };
})();


/* ---- render/fingers.js ---- */
// Finger control for the VRM hand. Fine finger articulation the primitive rig
// never had. Presets are pure data (curl amount per finger 0..1); apply() maps
// them onto the VRM humanoid finger bones.
//
// Curl axis: local Z. Verified sign — LEFT curls on negative Z, RIGHT on positive.
window.DANCE = window.DANCE || {};

DANCE.fingers = (function () {
  const FINGERS = ['Index', 'Middle', 'Ring', 'Little'];
  // Per-joint curl gain (radians at curl = 1). Distal knuckles bend most.
  const JOINT_GAIN = { Proximal: 1.05, Intermediate: 1.5, Distal: 0.9 };
  const THUMB_GAIN = { Metacarpal: 0.25, Proximal: 0.55, Distal: 0.7 };

  // Curl amount per finger + thumb for each named hand pose.
  const PRESETS = {
    relaxed: { Index: 0.28, Middle: 0.32, Ring: 0.38, Little: 0.45, thumb: 0.18 },
    open:    { Index: 0.02, Middle: 0.02, Ring: 0.02, Little: 0.02, thumb: 0.02 },
    spread:  { Index: 0.0,  Middle: 0.0,  Ring: 0.0,  Little: 0.0,  thumb: 0.0 },
    fist:    { Index: 1.0,  Middle: 1.0,  Ring: 1.0,  Little: 1.0,  thumb: 0.7 },
    point:   { Index: 0.0,  Middle: 1.0,  Ring: 1.0,  Little: 1.0,  thumb: 0.55 }
  };

  function presetOf(name) {
    return PRESETS[name] || PRESETS.relaxed;
  }

  // Apply a preset to both hands of the VRM. `humanoid` = vrm.humanoid.
  // getNode(name) returns the normalized bone node or null.
  function apply(humanoid, presetName) {
    const preset = presetOf(presetName);
    for (const side of ['left', 'right']) {
      const sign = side === 'left' ? -1 : 1; // curl direction on local Z
      // four fingers
      for (const finger of FINGERS) {
        const amt = preset[finger] ?? 0;
        for (const joint in JOINT_GAIN) {
          const node = humanoid.getNormalizedBoneNode(side + finger + joint);
          if (node) node.rotation.set(0, 0, sign * JOINT_GAIN[joint] * amt);
        }
      }
      // thumb: curls toward the palm on a blended axis (Z with a little Y splay)
      const t = preset.thumb ?? 0;
      for (const joint in THUMB_GAIN) {
        const node = humanoid.getNormalizedBoneNode(side + 'Thumb' + joint);
        if (node) node.rotation.set(0, sign * 0.35 * t, sign * THUMB_GAIN[joint] * t);
      }
    }
  }

  return { apply, presetOf, PRESETS };
})();


/* ---- render/springs.js ---- */
// Lightweight secondary motion — the "发力 / weight" feel on top of the crisp
// choreography. Two effects, both pure math (THREE-free, testable):
//   1. Weight shift: when the hips slide sideways, the upper body counter-leans
//      (centre-of-mass stays over the feet), like a real dancer shifting weight.
//   2. Follow-through: a slightly under-damped spring drags the chest/head behind
//      the driven pose, so the upper body overshoots and settles instead of
//      snapping — momentum, not teleport.
// Arms and legs are left crisp so the dance stays sharp; the real skirt/hair
// momentum comes from the VRM spring bones (vrm.update).
window.DANCE = window.DANCE || {};

DANCE.springs = (function () {
  // [joint, axis, stiffness, damping]. damping < 2*sqrt(stiffness) => overshoot.
  const CHANNELS = [
    ['chest', 'rz', 95, 13],
    ['chest', 'ry', 95, 13],
    ['head', 'rz', 120, 15],
    ['head', 'ry', 120, 15],
    ['spine', 'rz', 90, 14]
  ];

  function create() {
    const state = {}; // key -> {x, v}
    for (const [j, a] of CHANNELS) state[j + '.' + a] = { x: 0, v: 0 };

    function reset(pose) {
      for (const [j, a] of CHANNELS) {
        const s = state[j + '.' + a];
        s.x = (pose && pose[j] && pose[j][a]) || 0;
        s.v = 0;
      }
    }

    // Mutates pose in place. dt already clamped by the render loop.
    function update(pose, dt) {
      if (dt <= 0) return pose;
      // 1. weight shift: counter-lean the spine against lateral hip travel.
      const px = (pose.hips && pose.hips.px) || 0;
      if (pose.spine) pose.spine.rz = (pose.spine.rz || 0) - 0.45 * px;

      // 2. spring follow-through on the secondary channels.
      for (const [j, a, k, c] of CHANNELS) {
        if (!pose[j]) continue;
        const s = state[j + '.' + a];
        const target = pose[j][a] || 0;
        s.v += (k * (target - s.x) - c * s.v) * dt;
        s.x += s.v * dt;
        pose[j][a] = s.x;
      }
      return pose;
    }

    return { update, reset };
  }

  return { create, CHANNELS };
})();


/* ---- render/character.js ---- */
// Procedural humanoid rig (Theme 3 character).
// A joint hierarchy of Groups + primitive meshes. No skinning / external assets,
// so poses are driven by setting joint rotations directly.
window.DANCE = window.DANCE || {};

DANCE.createRig = function createRig() {
  const T = window.THREE;
  const skin = new T.MeshStandardMaterial({ color: 0xf1c9a5, roughness: 0.8 });
  const body = new T.MeshStandardMaterial({ color: 0x3a7bd5, roughness: 0.6, metalness: 0.1 });
  const limb = new T.MeshStandardMaterial({ color: 0x2b5fa8, roughness: 0.6 });
  const dark = new T.MeshStandardMaterial({ color: 0x1f2933, roughness: 0.7 });

  const root = new T.Group();
  const joints = {};

  function joint(parent, x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }
  function addLimb(parent, length, radius, mat) {
    const m = new T.Mesh(new T.CylinderGeometry(radius, radius * 0.85, length, 12), mat);
    m.position.y = -length / 2;
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function addBox(parent, w, h, d, x, y, z, mat) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function addSphere(parent, r, x, y, z, mat) {
    const m = new T.Mesh(new T.SphereGeometry(r, 16, 12), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  const restY = 0.9;

  // Torso chain
  joints.hips = joint(root, 0, restY, 0);
  addBox(joints.hips, 0.26, 0.16, 0.16, 0, 0, 0, body);
  joints.spine = joint(joints.hips, 0, 0.14, 0);
  addBox(joints.spine, 0.30, 0.34, 0.18, 0, 0.18, 0, body);
  joints.chest = joint(joints.spine, 0, 0.36, 0);
  joints.head = joint(joints.chest, 0, 0.06, 0);
  addSphere(joints.head, 0.12, 0, 0.13, skin);

  // Arms (hang down at rest along -Y)
  joints.armL = joint(joints.chest, 0.19, 0.0, 0);
  addLimb(joints.armL, 0.26, 0.045, limb);
  joints.forearmL = joint(joints.armL, 0, -0.26, 0);
  addLimb(joints.forearmL, 0.24, 0.04, limb);
  addSphere(joints.forearmL, 0.05, 0, -0.26, skin);

  joints.armR = joint(joints.chest, -0.19, 0.0, 0);
  addLimb(joints.armR, 0.26, 0.045, limb);
  joints.forearmR = joint(joints.armR, 0, -0.26, 0);
  addLimb(joints.forearmR, 0.24, 0.04, limb);
  addSphere(joints.forearmR, 0.05, 0, -0.26, skin);

  // Legs
  joints.legL = joint(joints.hips, 0.10, -0.02, 0);
  addLimb(joints.legL, 0.40, 0.06, limb);
  joints.shinL = joint(joints.legL, 0, -0.40, 0);
  addLimb(joints.shinL, 0.40, 0.05, limb);
  addBox(joints.shinL, 0.10, 0.06, 0.24, 0, -0.42, 0.06, dark);

  joints.legR = joint(joints.hips, -0.10, -0.02, 0);
  addLimb(joints.legR, 0.40, 0.06, limb);
  joints.shinR = joint(joints.legR, 0, -0.40, 0);
  addLimb(joints.shinR, 0.40, 0.05, limb);
  addBox(joints.shinR, 0.10, 0.06, 0.24, 0, -0.42, 0.06, dark);

  const rest = { x: 0, y: restY, z: 0 };

  function applyPose(pose) {
    for (const name of DANCE.moves.JOINTS) {
      const j = joints[name];
      const p = pose[name];
      if (!j || !p) continue;
      j.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    }
    const h = pose.hips;
    joints.hips.position.set(rest.x + (h.px || 0), rest.y + (h.py || 0), rest.z + (h.pz || 0));
  }

  // Start in idle rest.
  applyPose(DANCE.moves.basePose());

  return { root, joints, applyPose, restY, isVRM: false, update() {} };
};

// VRM-backed humanoid rig. Same public interface as createRig (applyPose/update)
// but drives a real human VRM model with joint limits, fingers and secondary
// physics. Retarget math verified in test/vrm-calib.html:
//   Q_local = A_parent * Euler(rx,ry,rz,'XYZ') * A_bone^-1
// because every normalized VRM bone is world-axis-aligned at rest and the only
// difference from the primitive rig is that arms rest sideways (±X) instead of
// hanging (-Y). A = identity everywhere except the arms (a ±90° roll about Z).
DANCE.createRigVRM = function createRigVRM(vrm) {
  const T = window.THREE;
  const h = vrm.humanoid;
  const spring = DANCE.springs.create();

  const I = new T.Quaternion();
  const Rz = (deg) => new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), deg * Math.PI / 180);
  const Ll = Rz(90), LlInv = Rz(-90), Rr = Rz(-90), RrInv = Rz(90);

  // primitive joint -> {bone, aPar, aInv}
  const MAP = [
    { p: 'hips', b: 'hips', aPar: I, aInv: I, hips: true },
    { p: 'spine', b: 'spine', aPar: I, aInv: I },
    { p: 'chest', b: 'chest', aPar: I, aInv: I },
    { p: 'head', b: 'head', aPar: I, aInv: I },
    { p: 'armL', b: 'leftUpperArm', aPar: I, aInv: LlInv },
    { p: 'forearmL', b: 'leftLowerArm', aPar: Ll, aInv: LlInv },
    { p: 'armR', b: 'rightUpperArm', aPar: I, aInv: RrInv },
    { p: 'forearmR', b: 'rightLowerArm', aPar: Rr, aInv: RrInv },
    { p: 'legL', b: 'leftUpperLeg', aPar: I, aInv: I },
    { p: 'shinL', b: 'leftLowerLeg', aPar: I, aInv: I },
    { p: 'legR', b: 'rightUpperLeg', aPar: I, aInv: I },
    { p: 'shinR', b: 'rightLowerLeg', aPar: I, aInv: I }
  ];
  for (const m of MAP) m.node = h.getNormalizedBoneNode(m.b);

  const hipsNode = h.getNormalizedBoneNode('hips');
  const restHips = hipsNode ? hipsNode.position.clone() : new T.Vector3();

  const tmpE = new T.Euler();
  const qd = new T.Quaternion();
  const ZERO = { rx: 0, ry: 0, rz: 0 };
  let curHands = 'relaxed';

  function applyPose(pose, dt) {
    DANCE.rigLimits.clamp(pose);
    if (typeof dt === 'number') spring.update(pose, dt);

    for (const m of MAP) {
      if (!m.node) continue;
      const p = pose[m.p] || ZERO;
      tmpE.set(p.rx || 0, p.ry || 0, p.rz || 0, 'XYZ');
      qd.setFromEuler(tmpE);
      m.node.quaternion.copy(m.aPar).multiply(qd).multiply(m.aInv);
      if (m.hips) {
        m.node.position.set(
          restHips.x + (p.px || 0),
          restHips.y + (p.py || 0),
          restHips.z + (p.pz || 0)
        );
      }
    }

    const hands = pose.hands || 'relaxed';
    if (hands !== curHands) curHands = hands;
    DANCE.fingers.apply(h, curHands);
  }

  applyPose(DANCE.moves.basePose());

  return {
    root: vrm.scene,
    applyPose,
    update(dt) { vrm.update(typeof dt === 'number' ? dt : 0); },
    isVRM: true
  };
};


/* ---- render/orbit.js ---- */
// Minimal orbit camera (drag to rotate, wheel to zoom).
// ponytail: ~40 lines instead of pulling the OrbitControls addon, which is
// ESM-only in three r160 and would force a bundler/import-map.
window.DANCE = window.DANCE || {};

DANCE.attachOrbit = function attachOrbit(camera, dom, target) {
  const t = target || new window.THREE.Vector3(0, 1, 0);
  let radius = camera.position.distanceTo(t) || 4;
  let theta = Math.atan2(camera.position.x - t.x, camera.position.z - t.z);
  let phi = Math.acos(Math.min(1, Math.max(-1, (camera.position.y - t.y) / radius)));
  let dragging = false, lastX = 0, lastY = 0;

  const clampPhi = () => { phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi)); };

  dom.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointerup', (e) => {
    dragging = false;
    try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  dom.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    theta -= (e.clientX - lastX) * 0.008;
    phi -= (e.clientY - lastY) * 0.008;
    clampPhi();
    lastX = e.clientX; lastY = e.clientY;
  });
  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    radius = Math.max(1.6, Math.min(9, radius * (1 + Math.sign(e.deltaY) * 0.1)));
  }, { passive: false });

  function update() {
    const sp = Math.sin(phi);
    camera.position.set(
      t.x + radius * sp * Math.sin(theta),
      t.y + radius * Math.cos(phi),
      t.z + radius * sp * Math.cos(theta)
    );
    camera.lookAt(t);
  }
  update();
  return { update, target: t };
};


/* ---- render/scene.js ---- */
// Scene setup: renderer, camera, lights, ground, grid.
window.DANCE = window.DANCE || {};

DANCE.createScene = function createScene(canvas) {
  const T = window.THREE;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.background = new T.Color(0x11151c);
  scene.fog = new T.Fog(0x11151c, 8, 22);

  const camera = new T.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(1.7, 1.25, 2.9);

  // Lights
  const hemi = new T.HemisphereLight(0xbfd4ff, 0x20242c, 0.7);
  scene.add(hemi);
  const key = new T.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  scene.add(key);
  const rim = new T.DirectionalLight(0x6ea8ff, 0.4);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  // Ground + grid
  const ground = new T.Mesh(
    new T.PlaneGeometry(40, 40),
    new T.MeshStandardMaterial({ color: 0x171b22, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new T.GridHelper(40, 40, 0x2a3442, 0x1c232c);
  grid.position.y = 0.001;
  scene.add(grid);

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { scene, camera, renderer, resize };
};


/* ---- render/sequencer.js ---- */
// Beat-synced sequencer: plays a MotionControlScript on the rig.
// Virtual beat clock (no audio needed for the release test); crossfades between
// consecutive moves; transition clips carry body-state changes.
window.DANCE = window.DANCE || {};

DANCE.Sequencer = function Sequencer(rig, onFrame) {
  const idleClip = DANCE.moves.get('idle');
  let script = null;
  let flat = [];
  let beat = 0;
  let playing = false;
  let loop = true;
  let cursor = 0;

  function applyInstance(inst, atBeat) {
    const clip = DANCE.moves.get(inst.clipId);
    const local = atBeat - inst.startBeat;
    const t01 = Math.max(0, Math.min(1, local / inst.durationBeats));
    const pose = DANCE.moves.basePose();
    clip.apply(pose, {
      beat: atBeat, local, t01,
      intensity: inst.intensity, amp: inst.ampScale, mirror: inst.mirror
    });
    pose.hips.ry += (inst.facingDeg || 0) * Math.PI / 180;
    pose.hips.pz += (inst.travel || 0) * 0.3;
    pose.hands = inst.hands || clip.hands || 'relaxed';
    return pose;
  }

  function blend(a, b, w) {
    const out = DANCE.moves.basePose();
    for (const j of DANCE.moves.JOINTS) {
      for (const c of ['rx', 'ry', 'rz']) {
        out[j][c] = (a[j][c] || 0) * (1 - w) + (b[j][c] || 0) * w;
      }
    }
    for (const c of ['px', 'py', 'pz']) {
      out.hips[c] = (a.hips[c] || 0) * (1 - w) + (b.hips[c] || 0) * w;
    }
    // fingers don't blend numerically; switch to the incoming gesture past halfway
    out.hands = w >= 0.5 ? (b.hands || 'relaxed') : (a.hands || 'relaxed');
    return out;
  }

  function setScript(s) {
    script = s;
    flat = s.timeline.flatMap((sec) =>
      sec.moves.map((m) => Object.assign({ sectionLabel: sec.sectionLabel }, m,
        { endBeat: m.startBeat + m.durationBeats }))
    );
    beat = 0; cursor = 0; playing = false;
    rig.applyPose(applyInstance(flat[0] || idleInstance(), 0));
    emit();
  }

  function idleInstance() {
    return { clipId: 'idle', startBeat: 0, durationBeats: 4, intensity: 1, ampScale: 1, mirror: 0, facingDeg: 0, sectionLabel: '-' };
  }

  function activeIndex(atBeat) {
    // advance/rewind cursor to the instance covering atBeat
    if (!flat.length) return -1;
    while (cursor > 0 && atBeat < flat[cursor].startBeat) cursor--;
    while (cursor < flat.length - 1 && atBeat >= flat[cursor].endBeat) cursor++;
    return cursor;
  }

  function update(dt) {
    if (!script) return;
    if (playing) {
      beat += dt * (script.bpm / 60);
      if (beat >= script.totalBeats) {
        if (loop) { beat = beat % script.totalBeats; cursor = 0; }
        else { beat = script.totalBeats; playing = false; }
      }
    }

    const i = activeIndex(beat);
    const cur = i >= 0 ? flat[i] : idleInstance();
    let pose = applyInstance(cur, beat);

    // crossfade into the next move near the boundary
    const next = flat[i + 1];
    if (next) {
      const xf = Math.min(0.5, cur.durationBeats * 0.5);
      if (beat > cur.endBeat - xf) {
        const w = (beat - (cur.endBeat - xf)) / xf;
        pose = blend(pose, applyInstance(next, beat), Math.max(0, Math.min(1, w)));
      }
    }

    rig.applyPose(pose, dt);
    emit(cur);
  }

  function emit(cur) {
    if (!onFrame) return;
    const bpb = script ? script.beatsPerBar : 4;
    onFrame({
      beat,
      bar: Math.floor(beat / bpb),
      total: script ? script.totalBeats : 0,
      section: cur ? cur.sectionLabel : '-',
      moveName: cur ? (cur.name || cur.clipId) : '-',
      bodyState: cur ? (cur.bodyState || 'STAND') : 'STAND',
      playing
    });
  }

  return {
    setScript,
    play() { if (script) { if (beat >= script.totalBeats) { beat = 0; cursor = 0; } playing = true; } },
    pause() { playing = false; },
    stop() { playing = false; beat = 0; cursor = 0; if (script) rig.applyPose(applyInstance(flat[0] || idleInstance(), 0)); emit(); },
    setLoop(v) { loop = !!v; },
    update,
    isPlaying() { return playing; }
  };
};


/* ---- render/selfcheck.js ---- */
// On-load self-check (ponytail's runnable check).
// Validates that every generated script is contiguous, uses known clips, obeys
// the body-state machine, and that the 5 scripts are diverse.
window.DANCE = window.DANCE || {};

DANCE.selfcheck = function selfcheck(scripts) {
  const results = [];
  let ok = true;

  for (const s of scripts) {
    const v = DANCE.choreographer.validate(s);
    if (!v.ok) ok = false;
    results.push({ seed: s.seed, ok: v.ok, errors: v.errors, moves: s.timeline.reduce((n, sec) => n + sec.moves.length, 0) });
  }

  // Diversity: distinct move-sequence signatures.
  const sigs = new Set(
    scripts.map((s) => s.timeline.flatMap((sec) => sec.moves.map((m) => m.clipId)).join(','))
  );
  const diverse = sigs.size >= Math.min(2, scripts.length);
  if (!diverse) ok = false;

  const summary = `${results.filter((r) => r.ok).length}/${results.length} scripts valid, ${sigs.size} distinct`;
  console[ok ? 'log' : 'error']('[selfcheck]', summary, results);
  return { pass: ok, summary, results, distinct: sigs.size };
};


/* ---- main.js ---- */
// App bootstrap: build scene + rig, generate 5 seeds -> 5 scripts, wire UI.
// Called by the module loader once THREE + (optionally) the VRM are ready.
// `vrm` is the loaded @pixiv/three-vrm model, or null to fall back to the
// zero-asset primitive rig (e.g. when opened over file://).
DANCE.main = function main(vrm) {
  const canvas = document.getElementById('stage');
  const { scene, camera, renderer, resize } = DANCE.createScene(canvas);
  const rig = vrm ? DANCE.createRigVRM(vrm) : DANCE.createRig();
  scene.add(rig.root);

  const orbit = DANCE.attachOrbit(camera, renderer.domElement, new THREE.Vector3(0, 0.95, 0));

  const hud = {
    status: document.getElementById('status'),
    select: document.getElementById('scriptSelect'),
    brief: document.getElementById('brief'),
    beat: document.getElementById('beat'),
    section: document.getElementById('section'),
    move: document.getElementById('move'),
    state: document.getElementById('state'),
    dot: document.getElementById('beatDot')
  };

  const seq = DANCE.Sequencer(rig, (f) => {
    hud.beat.textContent = `${f.beat.toFixed(1)} / ${f.total}`;
    hud.section.textContent = f.section;
    hud.move.textContent = f.moveName;
    hud.state.textContent = f.bodyState;
    // pulse the beat dot on each beat
    const frac = f.beat - Math.floor(f.beat);
    hud.dot.style.transform = `scale(${1 + (1 - frac) * 0.8})`;
    hud.dot.style.opacity = String(0.35 + (1 - frac) * 0.65);
  });
  seq.setLoop(true);

  let scripts = [];

  function generate() {
    const song = DANCE.constants.DEMO_SONG;
    const seeds = DANCE.seeds.randomStrings(5);
    scripts = seeds.map((s) => DANCE.choreographer.compose(DANCE.seeds.seedToBrief(s), song));

    const check = DANCE.selfcheck(scripts);
    hud.status.textContent = check.pass
      ? `Self-check PASS — ${check.summary}`
      : `Self-check FAIL — ${check.summary}`;
    hud.status.className = check.pass ? 'ok' : 'fail';

    hud.select.innerHTML = '';
    scripts.forEach((s, i) => {
      const opt = document.createElement('option');
      const moves = s.timeline.reduce((n, sec) => n + sec.moves.length, 0);
      opt.value = String(i);
      opt.textContent = `#${i + 1} · ${s.brief.dance_genre} · ${s.brief.energy_bias} · ${moves} moves`;
      hud.select.appendChild(opt);
    });
    selectScript(0);
  }

  function selectScript(i) {
    const s = scripts[i];
    if (!s) return;
    seq.setScript(s);
    const b = s.brief;
    hud.brief.textContent =
      `seed ${b.seed} · genre ${b.dance_genre} · energy ${b.energy_bias} · ` +
      `spatial ${b.spatial_style} · complexity ${b.complexity} · ` +
      `stateBias ${b.body_state_bias} · ${s.bpm} BPM`;
  }

  // UI wiring
  hud.select.addEventListener('change', (e) => { seq.pause(); selectScript(Number(e.target.value)); setPlayLabel(); });
  document.getElementById('play').addEventListener('click', () => { seq.isPlaying() ? seq.pause() : seq.play(); setPlayLabel(); });
  document.getElementById('stop').addEventListener('click', () => { seq.stop(); setPlayLabel(); });
  document.getElementById('regen').addEventListener('click', () => { seq.stop(); generate(); setPlayLabel(); });
  document.getElementById('loop').addEventListener('change', (e) => seq.setLoop(e.target.checked));

  function setPlayLabel() {
    document.getElementById('play').textContent = seq.isPlaying() ? 'Pause' : 'Play';
  }

  // Render loop
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    seq.update(dt);
    rig.update(dt); // VRM spring bones (hair/cloth momentum) + normalized->raw
    orbit.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  generate();
  setPlayLabel();
  tick();
};


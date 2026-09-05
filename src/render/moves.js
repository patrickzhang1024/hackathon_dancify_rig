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

// Built by rig/build.ps1 鈥?do not edit. Concatenation of rig/src in load order.

/* ---- config/constants.js ---- */
// Song and choreography taxonomies.
// Pure JS, no THREE dependency, so it can run in a browser or Node.
window.DANCE = window.DANCE || {};

DANCE.constants = (function () {
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
    reggae: ['reggae_dance', 'street_hiphop'],
    dancehall: ['reggae_dance', 'street_hiphop'],
    latin: ['freestyle'],
    folk: ['folk_dance'],
    world: ['folk_dance'],
    rock: ['freestyle'],
    classical: ['ballet', 'contemporary'],
    ballet: ['ballet']
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
    'jazz_funk', 'commercial_kpop', 'reggae_dance', 'ballet',
    'folk_dance', 'contemporary', 'lyrical', 'freestyle'
  ];

  return { GENRE_TO_DANCE, DEMO_SONG, DANCE_GENRES };
})();


/* ---- render/motionScript.js ---- */
// MotionScript v2: independent beat-keyed rotation channels for every joint.
// This module is THREE-free so generated scripts can be validated in tests.
window.DANCE = window.DANCE || {};

DANCE.motionScript = (function () {
  const SIDES = ['L', 'R'];
  const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
  const JOINTS = ['hips', 'spine', 'spine1', 'spine2', 'neck', 'head'];

  for (const side of SIDES) {
    JOINTS.push('clavicle' + side, 'upperArm' + side, 'lowerArm' + side, 'hand' + side);
    for (const finger of FINGERS) {
      JOINTS.push(
        finger.toLowerCase() + 'Proximal' + side,
        finger.toLowerCase() + 'Intermediate' + side,
        finger.toLowerCase() + 'Distal' + side
      );
    }
    JOINTS.push('upperLeg' + side, 'lowerLeg' + side, 'foot' + side, 'toeBase' + side);
  }

  const JOINT_SET = new Set(JOINTS);
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const JOINT_LIMITS = {
    hips: [[-0.45, 0.45], [-0.7, 0.7], [-0.4, 0.4]],
    spine: [[-0.35, 0.45], [-0.45, 0.45], [-0.35, 0.35]],
    spine1: [[-0.35, 0.45], [-0.5, 0.5], [-0.38, 0.38]],
    spine2: [[-0.35, 0.45], [-0.55, 0.55], [-0.4, 0.4]],
    neck: [[-0.5, 0.6], [-0.8, 0.8], [-0.45, 0.45]],
    head: [[-0.35, 0.45], [-0.65, 0.65], [-0.4, 0.4]],
    clavicle: [[-0.25, 0.25], [-0.25, 0.25], [-0.35, 0.35]],
    upperArm: [[-2.1, 2.1], [-1.35, 1.35], [-1.75, 1.75]],
    lowerArm: [[-0.09, 2.5], [-0.17, 0.17], [-0.17, 0.17]],
    hand: [[-1.35, 1.2], [-0.35, 0.55], [-0.3, 0.3]],
    fingerProximal: [[-0.15, 1.75], [-0.18, 0.18], [-0.18, 0.18]],
    fingerIntermediate: [[0, 1.9], [-0.08, 0.08], [-0.08, 0.08]],
    fingerDistal: [[0, 1.4], [-0.06, 0.06], [-0.06, 0.06]],
    thumbProximal: [[-0.35, 1.2], [-0.7, 0.7], [-0.7, 0.7]],
    thumbIntermediate: [[-0.1, 1.35], [-0.2, 0.2], [-0.2, 0.2]],
    thumbDistal: [[-0.05, 1.4], [-0.12, 0.12], [-0.12, 0.12]],
    upperLeg: [[-0.55, 2.05], [-0.65, 0.65], [-0.55, 0.55]],
    lowerLeg: [[-0.09, 2.5], [-0.12, 0.12], [-0.12, 0.12]],
    foot: [[-0.85, 0.45], [-0.3, 0.3], [-0.35, 0.35]],
    toe: [[-0.45, 0.7], [-0.08, 0.08], [-0.08, 0.08]]
  };
  const easing = {
    linear: (value) => value,
    smooth: (value) => value * value * (3 - 2 * value),
    hold: () => 0
  };

  function limitKey(joint) {
    const finger = joint.match(/^(thumb|index|middle|ring|little)(Proximal|Intermediate|Distal)/);
    if (finger) return (finger[1] === 'thumb' ? 'thumb' : 'finger') + finger[2];
    if (joint.startsWith('toe')) return 'toe';
    return joint.replace(/[LR]$/, '');
  }

  function clampRotation(joint, rotation) {
    const limits = JOINT_LIMITS[limitKey(joint)];
    if (!limits) return rotation;
    return rotation.map((value, axis) => Math.max(limits[axis][0], Math.min(limits[axis][1], value)));
  }

  function basePose() {
    const pose = {};
    for (const joint of JOINTS) pose[joint] = { rx: 0, ry: 0, rz: 0 };
    pose.hips.px = 0;
    pose.hips.py = 0;
    pose.hips.pz = 0;
    return pose;
  }

  function sample(keys, beat, size) {
    if (!keys || keys.length === 0) return new Array(size).fill(0);
    if (beat <= keys[0].beat) return keys[0].value.slice();
    const last = keys[keys.length - 1];
    if (beat >= last.beat) return last.value.slice();

    let nextIndex = 1;
    while (keys[nextIndex].beat < beat) nextIndex++;
    const previous = keys[nextIndex - 1];
    const next = keys[nextIndex];
    const progress = clamp01((beat - previous.beat) / (next.beat - previous.beat));
    const weight = (easing[previous.easing || 'smooth'] || easing.smooth)(progress);
    return previous.value.map((value, index) => value + (next.value[index] - value) * weight);
  }

  function evaluate(script, beat) {
    const pose = basePose();
    for (const joint in script.tracks) {
      const track = script.tracks[joint];
      const rotation = clampRotation(joint, sample(track.rotation, beat, 3));
      pose[joint].rx = rotation[0];
      pose[joint].ry = rotation[1];
      pose[joint].rz = rotation[2];
      if (joint === 'hips' && track.position) {
        const position = sample(track.position, beat, 3);
        pose.hips.px = position[0];
        pose.hips.py = position[1];
        pose.hips.pz = position[2];
      }
    }
    return pose;
  }

  function validate(script) {
    const errors = [];
    if (!script || script.version !== 2) errors.push('version must be 2');
    if (!script || !(script.bpm > 0)) errors.push('bpm must be positive');
    if (!script || !(script.totalBeats > 0)) errors.push('totalBeats must be positive');
    if (!script || !script.tracks || typeof script.tracks !== 'object') {
      errors.push('tracks must be an object');
      return { ok: false, errors };
    }

    if (script.beatTimeline) {
      if (!Array.isArray(script.beatTimeline) || script.beatTimeline.length < 2) {
        errors.push('beatTimeline must contain at least 2 entries');
      } else {
        let previousBeat = -Infinity;
        let previousTime = -Infinity;
        for (const entry of script.beatTimeline) {
          if (!entry || !Number.isFinite(entry.beat) || !Number.isFinite(entry.timeS) ||
              entry.beat <= previousBeat || entry.timeS <= previousTime) {
            errors.push('beatTimeline beat and timeS values must be finite and strictly ordered');
            break;
          }
          previousBeat = entry.beat;
          previousTime = entry.timeS;
        }
      }
    }

    for (const joint in script.tracks) {
      if (!JOINT_SET.has(joint)) errors.push('unknown joint ' + joint);
      const track = script.tracks[joint];
      for (const channel of ['rotation', 'position']) {
        const keys = track[channel];
        if (channel === 'position' && joint !== 'hips' && keys) {
          errors.push('position is only valid on hips');
        }
        if (!keys) continue;
        let previousBeat = -Infinity;
        for (const key of keys) {
          if (!Number.isFinite(key.beat) || key.beat < previousBeat) {
            errors.push(joint + '.' + channel + ' keys must be ordered');
          }
          if (!Array.isArray(key.value) || key.value.length !== 3 || !key.value.every(Number.isFinite)) {
            errors.push(joint + '.' + channel + ' values must contain 3 finite numbers');
          }
          if (key.easing && !easing[key.easing]) errors.push('unknown easing ' + key.easing);
          previousBeat = key.beat;
        }
      }
    }
    return { ok: errors.length === 0, errors };
  }

  return { JOINTS, SIDES, FINGERS, JOINT_LIMITS, basePose, evaluate, validate };
})();

/* ---- render/actionLibrary.js ---- */
// Reusable full-body action primitives for ActionScript choreography plans.
// frequency is cycles per beat; duration is repetitions / frequency beats.
window.DANCE = window.DANCE || {};

DANCE.actionLibrary = (function () {
  const TAU = Math.PI * 2;
  const GROUPS = ['hands', 'legs', 'waist', 'neck', 'arms'];
  const round3 = (value) => Math.round(value * 1000) / 1000;
  const pulse = (phase) => (1 - Math.cos(TAU * phase)) * 0.5;
  const wave = (phase) => Math.sin(TAU * phase);

  function rotations(values) {
    return { rotations: values };
  }

  const DEFINITIONS = {
    wristFlick: {
      group: 'hands', label: 'alternating wrist flicks',
      sample: (phase, intensity) => rotations({
        handL: [0, 0, 0.28 * wave(phase) * intensity],
        handR: [0, 0, -0.28 * wave(phase) * intensity]
      })
    },
    fistPulse: {
      group: 'hands', label: 'close and release both hands',
      sample: (phase, intensity) => {
        const values = {};
        const curl = 1.05 * pulse(phase) * intensity;
        for (const side of DANCE.motionScript.SIDES) {
          for (const finger of DANCE.motionScript.FINGERS) {
            const name = finger.toLowerCase();
            values[name + 'Proximal' + side] = [curl, 0, 0];
            values[name + 'Intermediate' + side] = [curl * 0.9, 0, 0];
            values[name + 'Distal' + side] = [curl * 0.65, 0, 0];
          }
        }
        return rotations(values);
      }
    },
    fingerRipple: {
      group: 'hands', label: 'ripple through the fingers',
      sample: (phase, intensity) => {
        const values = {};
        for (const side of DANCE.motionScript.SIDES) {
          DANCE.motionScript.FINGERS.forEach((finger, index) => {
            const name = finger.toLowerCase();
            const curl = 0.75 * pulse((phase + index * 0.12) % 1) * intensity;
            values[name + 'Proximal' + side] = [curl, 0, 0];
            values[name + 'Intermediate' + side] = [curl, 0, 0];
            values[name + 'Distal' + side] = [curl * 0.6, 0, 0];
          });
        }
        return rotations(values);
      }
    },
    stepTouch: {
      group: 'legs', label: 'alternating grounded step-touch',
      sample: (phase, intensity) => {
        const swing = wave(phase);
        const left = Math.max(0, swing) * intensity;
        const right = Math.max(0, -swing) * intensity;
        return rotations({
          upperLegL: [0.42 * left, 0, 0.1 * swing * intensity],
          lowerLegL: [0.5 * left, 0, 0], footL: [0.18 * left, 0, 0],
          upperLegR: [0.42 * right, 0, 0.1 * swing * intensity],
          lowerLegR: [0.5 * right, 0, 0], footR: [0.18 * right, 0, 0]
        });
      }
    },
    kneeLift: {
      group: 'legs', label: 'alternating knee lifts',
      sample: (phase, intensity) => {
        const swing = wave(phase);
        const left = Math.max(0, swing) * intensity;
        const right = Math.max(0, -swing) * intensity;
        return rotations({
          upperLegL: [0.9 * left, 0, 0], lowerLegL: [1.0 * left, 0, 0],
          upperLegR: [0.9 * right, 0, 0], lowerLegR: [1.0 * right, 0, 0]
        });
      }
    },
    squatPulse: {
      group: 'legs', label: 'grounded squat pulses',
      sample: (phase, intensity) => {
        const bend = pulse(phase) * intensity;
        return rotations({
          upperLegL: [0.48 * bend, 0, 0.08 * bend], lowerLegL: [0.62 * bend, 0, 0],
          upperLegR: [0.48 * bend, 0, -0.08 * bend], lowerLegR: [0.62 * bend, 0, 0]
        });
      }
    },
    kickStep: {
      group: 'legs', label: 'alternating compact kicks',
      sample: (phase, intensity) => {
        const swing = wave(phase);
        const left = Math.max(0, swing) * intensity;
        const right = Math.max(0, -swing) * intensity;
        return rotations({
          upperLegL: [0.62 * left, 0, 0], lowerLegL: [0.25 * left, 0, 0], footL: [-0.35 * left, 0, 0],
          upperLegR: [0.62 * right, 0, 0], lowerLegR: [0.25 * right, 0, 0], footR: [-0.35 * right, 0, 0]
        });
      }
    },
    hipSway: {
      group: 'waist', label: 'side-to-side hip sway',
      sample: (phase, intensity) => {
        const sway = wave(phase) * intensity;
        return {
          rotations: { hips: [0, 0.3 * sway, 0.16 * sway], spine: [0, -0.15 * sway, -0.08 * sway] },
          position: [0.08 * sway, 0, 0]
        };
      }
    },
    hipRoll: {
      group: 'waist', label: 'circular hip roll',
      sample: (phase, intensity) => {
        const side = wave(phase) * intensity;
        const depth = (Math.cos(TAU * phase) - 1) * intensity;
        return {
          rotations: { hips: [0.1 * depth, 0.28 * side, 0.16 * side], spine: [-0.06 * depth, -0.12 * side, 0] },
          position: [0.06 * side, 0, 0.035 * depth]
        };
      }
    },
    bodyBounce: {
      group: 'waist', label: 'vertical body bounce',
      sample: (phase, intensity) => {
        const bend = pulse(phase) * intensity;
        return {
          rotations: { hips: [0.16 * bend, 0, 0], spine: [-0.08 * bend, 0, 0], spine2: [-0.06 * bend, 0, 0] },
          position: [0, -0.1 * bend, 0]
        };
      }
    },
    torsoTwist: {
      group: 'waist', label: 'opposed waist and torso twist',
      sample: (phase, intensity) => {
        const twist = wave(phase) * intensity;
        return rotations({ hips: [0, 0.2 * twist, 0], spine: [0, -0.2 * twist, 0], spine2: [0, -0.18 * twist, 0] });
      }
    },
    headNod: {
      group: 'neck', label: 'head nod accents',
      sample: (phase, intensity) => rotations({ neck: [0.16 * wave(phase) * intensity, 0, 0], head: [0.12 * wave(phase) * intensity, 0, 0] })
    },
    headLook: {
      group: 'neck', label: 'look left and right',
      sample: (phase, intensity) => rotations({ neck: [0, 0.28 * wave(phase) * intensity, 0], head: [0, 0.2 * wave(phase) * intensity, 0] })
    },
    neckRoll: {
      group: 'neck', label: 'small controlled neck circle',
      sample: (phase, intensity) => rotations({
        neck: [0.1 * wave(phase) * intensity, 0, 0.1 * (Math.cos(TAU * phase) - 1) * intensity],
        head: [0.08 * wave(phase) * intensity, 0, 0.08 * (Math.cos(TAU * phase) - 1) * intensity]
      })
    },
    headAccent: {
      group: 'neck', label: 'short head-and-chest accent',
      sample: (phase, intensity) => {
        const hit = pulse(phase) * intensity;
        return rotations({ neck: [-0.15 * hit, 0, 0], head: [0.18 * hit, 0, 0] });
      }
    },
    armSwing: {
      group: 'arms', label: 'alternating arm swings',
      sample: (phase, intensity) => {
        const swing = wave(phase) * intensity;
        return rotations({
          upperArmL: [0.95 * swing, 0, 0.22], lowerArmL: [0.45 * pulse(phase), 0, 0],
          upperArmR: [-0.95 * swing, 0, -0.22], lowerArmR: [0.45 * pulse(phase), 0, 0]
        });
      }
    },
    armWave: {
      group: 'arms', label: 'two-arm wave',
      sample: (phase, intensity) => {
        const lift = pulse(phase) * intensity;
        const ripple = pulse((phase + 0.2) % 1) * intensity;
        return rotations({
          upperArmL: [1.15 * lift, 0, 0.55 * lift], lowerArmL: [0.9 * ripple, 0, 0],
          upperArmR: [-1.15 * lift, 0, -0.55 * lift], lowerArmR: [0.9 * ripple, 0, 0]
        });
      }
    },
    reachUp: {
      group: 'arms', label: 'both arms reach overhead',
      sample: (phase, intensity) => {
        const lift = pulse(phase) * intensity;
        return rotations({
          upperArmL: [1.5 * lift, 0, 0.38 * lift], lowerArmL: [0.28 * lift, 0, 0],
          upperArmR: [-1.5 * lift, 0, -0.38 * lift], lowerArmR: [0.28 * lift, 0, 0]
        });
      }
    },
    openClose: {
      group: 'arms', label: 'open and close the arms',
      sample: (phase, intensity) => {
        const open = pulse(phase) * intensity;
        return rotations({
          upperArmL: [0.35 * open, 0, 1.15 * open], lowerArmL: [0.2 * open, 0, 0],
          upperArmR: [-0.35 * open, 0, -1.15 * open], lowerArmR: [0.2 * open, 0, 0]
        });
      }
    },
    crossPunch: {
      group: 'arms', label: 'alternating cross-body punches',
      sample: (phase, intensity) => {
        const swing = wave(phase);
        const left = Math.max(0, swing) * intensity;
        const right = Math.max(0, -swing) * intensity;
        return rotations({
          upperArmL: [1.25 * left, 0.35 * left, 0], lowerArmL: [0.15 * left, 0, 0],
          upperArmR: [-1.25 * right, -0.35 * right, 0], lowerArmR: [0.15 * right, 0, 0]
        });
      }
    }
  };

  function limitKey(joint) {
    const finger = joint.match(/^(thumb|index|middle|ring|little)(Proximal|Intermediate|Distal)/);
    if (finger) return (finger[1] === 'thumb' ? 'thumb' : 'finger') + finger[2];
    if (joint.startsWith('toe')) return 'toe';
    return joint.replace(/[LR]$/, '');
  }

  function clampRotation(joint, value) {
    const limits = DANCE.motionScript.JOINT_LIMITS[limitKey(joint)];
    return value.map((axis, index) => round3(limits
      ? Math.max(limits[index][0], Math.min(limits[index][1], axis))
      : axis));
  }

  function durationOf(action) {
    return action.repetitions / action.frequency;
  }

  function coverageError(actions, totalBeats, group) {
    const intervals = actions
      .filter((action) => DEFINITIONS[action.action].group === group)
      .map((action) => [action.startBeat, action.startBeat + durationOf(action)])
      .sort((a, b) => a[0] - b[0]);
    let coveredUntil = 0;
    for (const interval of intervals) {
      if (interval[0] > coveredUntil + 0.001) return group + ' actions leave a gap at beat ' + round3(coveredUntil);
      coveredUntil = Math.max(coveredUntil, interval[1]);
    }
    return coveredUntil + 0.001 < totalBeats ? group + ' actions end at beat ' + round3(coveredUntil) : null;
  }

  function validate(actions, totalBeats, requireFullCoverage) {
    if (!Array.isArray(actions) || !actions.length) return 'actions must be a non-empty array';
    if (!(totalBeats > 0)) return 'totalBeats must be positive';
    if (actions.length > 1000) return 'too many actions';
    for (const action of actions) {
      if (!action || !DEFINITIONS[action.action]) return 'unknown action "' + (action && action.action) + '"';
      if (!Number.isFinite(action.startBeat) || action.startBeat < 0 || action.startBeat >= totalBeats) {
        return 'each action needs startBeat within the song';
      }
      if (!Number.isFinite(action.frequency) || action.frequency <= 0 || action.frequency > 4) {
        return 'frequency must be within (0, 4] cycles per beat';
      }
      if (!Number.isFinite(action.repetitions) || action.repetitions <= 0 || action.repetitions > 256) {
        return 'repetitions must be within (0, 256]';
      }
      if (action.intensity != null && (!Number.isFinite(action.intensity) || action.intensity < 0.5 || action.intensity > 1.5)) {
        return 'intensity must be within [0.5, 1.5]';
      }
      if (action.startBeat + durationOf(action) > totalBeats + 0.001) return action.action + ' extends past the song';
    }
    if (requireFullCoverage) {
      for (const group of GROUPS) {
        const error = coverageError(actions, totalBeats, group);
        if (error) return error;
      }
    }
    return null;
  }

  function compile(actions, totalBeats, samplePoints) {
    const error = validate(actions, totalBeats, true);
    if (error) throw new Error('Invalid ActionScript: ' + error);
    const beats = samplePoints || Array.from({ length: Math.floor(totalBeats) + 1 }, (_, beat) => beat);
    if (!beats.length || beats[beats.length - 1] < totalBeats) beats.push(totalBeats);
    const tracks = {};
    for (const joint of DANCE.motionScript.JOINTS) tracks[joint] = { rotation: [] };
    tracks.hips.position = [];

    for (const beat of beats) {
      const pose = {};
      for (const joint of DANCE.motionScript.JOINTS) pose[joint] = [0, 0, 0];
      const position = [0, 0, 0];
      for (const action of actions) {
        const duration = durationOf(action);
        if (beat + 0.000001 < action.startBeat || beat >= action.startBeat + duration - 0.000001) continue;
        const localCycles = Math.max(0, beat - action.startBeat) * action.frequency;
        const phase = localCycles - Math.floor(localCycles);
        const sample = DEFINITIONS[action.action].sample(phase, action.intensity == null ? 1 : action.intensity);
        for (const joint in sample.rotations) {
          for (let axis = 0; axis < 3; axis++) pose[joint][axis] += sample.rotations[joint][axis];
        }
        if (sample.position) for (let axis = 0; axis < 3; axis++) position[axis] += sample.position[axis];
      }
      for (const joint of DANCE.motionScript.JOINTS) {
        tracks[joint].rotation.push({ beat, value: clampRotation(joint, pose[joint]), easing: 'smooth' });
      }
      tracks.hips.position.push({ beat, value: position.map(round3), easing: 'smooth' });
    }
    return tracks;
  }

  function list() {
    return Object.keys(DEFINITIONS).map((name) => ({ name, group: DEFINITIONS[name].group, label: DEFINITIONS[name].label }));
  }

  return { GROUPS, list, validate, compile, durationOf };
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
// Deterministic MotionScript v2 generator. Output is editable keyframe data;
// there are no named move clips or hidden procedural animation functions.
window.DANCE = window.DANCE || {};

DANCE.choreographer = (function () {
  const key = (beat, value, easing) => ({ beat, value, easing: easing || 'smooth' });
  const track = (keys) => ({ rotation: keys });
  const rounded = (value) => Math.round(value * 1000) / 1000;

  function compose(brief, song) {
    const rng = DANCE.seeds.mulberry32(brief.rngSeed >>> 0);
    const totalBeats = song.sections.reduce((sum, section) => sum + section.bars * song.beatsPerBar, 0);
    const amplitude = 0.75 + rng() * 0.35;
    const direction = rng() < 0.5 ? -1 : 1;
    const tracks = {};
    const markers = [];

    let sectionStart = 0;
    for (const section of song.sections) {
      markers.push({ beat: sectionStart, label: section.label });
      sectionStart += section.bars * song.beatsPerBar;
    }

    function wave(joint, axis, scale, offset, frequency) {
      const keys = [];
      for (let beat = 0; beat <= totalBeats; beat += 2) {
        const value = [0, 0, 0];
        value[axis] = rounded(Math.sin(beat * Math.PI * (frequency || 0.25) + (offset || 0)) * scale * amplitude);
        keys.push(key(beat, value));
      }
      tracks[joint] = track(keys);
    }

    function hinge(joint, scale, frequency) {
      const keys = [];
      for (let beat = 0; beat <= totalBeats; beat += 2) {
        const flexion = (1 - Math.cos(beat * Math.PI * (frequency || 0.25))) * 0.5;
        keys.push(key(beat, [rounded(flexion * scale * amplitude), 0, 0]));
      }
      tracks[joint] = track(keys);
    }

    wave('hips', 1, 0.24 * direction, 0, 0.25);
    tracks.hips.position = [];
    for (let beat = 0; beat <= totalBeats; beat += 1) {
      tracks.hips.position.push(key(beat, [
        rounded(Math.sin(beat * Math.PI * 0.25) * 0.1 * direction),
        rounded(-Math.abs(Math.sin(beat * Math.PI)) * 0.055 * amplitude),
        rounded(Math.sin(beat * Math.PI * 0.125) * 0.045)
      ]));
    }
    wave('spine', 2, 0.1, 0, 0.25);
    wave('spine1', 2, 0.12, 0, 0.25);
    wave('spine2', 1, 0.28 * direction, Math.PI, 0.25);
    wave('neck', 2, 0.06, Math.PI, 0.25);
    wave('head', 1, 0.14 * direction, 0, 0.25);

    for (const side of DANCE.motionScript.SIDES) {
      const sign = side === 'L' ? 1 : -1;
      wave('clavicle' + side, 2, 0.08 * sign, 0, 0.25);
      wave('upperArm' + side, 0, 1.25 * sign, 0, 0.25);
      hinge('lowerArm' + side, 0.9, 0.25);
      wave('hand' + side, 2, 0.35 * sign, 0, 0.5);
      wave('upperLeg' + side, 0, 0.55 * sign, 0, 0.25);
      hinge('lowerLeg' + side, 0.72, 0.25);
      wave('foot' + side, 0, 0.3 * sign, 0, 0.5);

      DANCE.motionScript.FINGERS.forEach((finger, index) => {
        const name = finger.toLowerCase();
        const curl = 0.25 + index * 0.08;
        wave(name + 'Proximal' + side, 0, curl, 0, 0.5);
        wave(name + 'Intermediate' + side, 0, curl * 1.25, 0, 0.5);
        wave(name + 'Distal' + side, 0, curl, 0, 0.5);
      });
      wave('toeBase' + side, 0, 0.16, 0, 0.5);
    }

    return {
      version: 2, seed: brief.seed, brief, title: song.title,
      bpm: song.bpm, beatsPerBar: song.beatsPerBar, totalBeats, markers, tracks
    };
  }

  return { compose, validate: DANCE.motionScript.validate };
})();


/* ---- render/skeleton.js ---- */
// Skeleton view in the skin-tokens form: a flat rig of
// { names, parents, rest_positions } with strict parent-before-child ordering,
// exactly one root, and joint-to-joint segments. See reference/skin-tokens
// (skintokens.hpp `struct skeleton`, retarget.cpp `validate`).
window.DANCE = window.DANCE || {};

DANCE.skeleton = (function () {
  // Internal MotionScript joint name -> canonical Mixamo52 bone name, so the
  // emitted rig is exactly reference/skin-tokens' Mixamo52 (retarget.cpp).
  const MIXAMO52 = (function () {
    const body = {
      hips: 'Hips', spine: 'Spine', spine1: 'Spine1', spine2: 'Spine2', neck: 'Neck', head: 'Head',
      clavicleL: 'LeftShoulder', upperArmL: 'LeftArm', lowerArmL: 'LeftForeArm', handL: 'LeftHand',
      clavicleR: 'RightShoulder', upperArmR: 'RightArm', lowerArmR: 'RightForeArm', handR: 'RightHand',
      upperLegL: 'LeftUpLeg', lowerLegL: 'LeftLeg', footL: 'LeftFoot', toeBaseL: 'LeftToeBase',
      upperLegR: 'RightUpLeg', lowerLegR: 'RightLeg', footR: 'RightFoot', toeBaseR: 'RightToeBase'
    };
    const fingerName = { thumb: 'Thumb', index: 'Index', middle: 'Middle', ring: 'Ring', little: 'Pinky' };
    const partNum = { Proximal: '1', Intermediate: '2', Distal: '3' };
    const map = {};
    for (const key in body) map[key] = 'mixamorig:' + body[key];
    for (const side of ['L', 'R']) {
      const hand = side === 'L' ? 'Left' : 'Right';
      for (const finger in fingerName) {
        for (const part in partNum) {
          map[finger + part + side] = 'mixamorig:' + hand + 'Hand' + fingerName[finger] + partNum[part];
        }
      }
    }
    return map;
  })();

  // The exact 52-name set of reference/skin-tokens' Mixamo52 rig.
  const CANONICAL_MIXAMO52 = (function () {
    const names = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
      'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
      'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
    for (const hand of ['Left', 'Right']) {
      for (const finger of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
        for (const num of ['1', '2', '3']) names.push(hand + 'Hand' + finger + num);
      }
    }
    return new Set(names.map((n) => 'mixamorig:' + n));
  })();

  function assertMixamo52(names) {
    if (names.length !== 52) throw new Error('skeleton must have 52 Mixamo52 joints, got ' + names.length);
    for (const name of names) {
      if (!CANONICAL_MIXAMO52.has(name)) throw new Error('joint is not part of Mixamo52: ' + name);
    }
  }

  // Reduce the authored bone hierarchy to the semantic joints MotionScript drives,
  // emitted under canonical Mixamo52 names. Each joint's parent is its nearest
  // ancestor that is itself a driven joint, so every segment connects two real
  // joints (strict joint-to-joint binding).
  function build(joints) {
    const order = DANCE.motionScript.JOINTS.filter((name) => joints[name]);
    const boneToJoint = new Map();
    for (const name of order) boneToJoint.set(joints[name], name);
    const indexOf = new Map(order.map((name, i) => [name, i]));

    const names = order.map((name) => {
      const mixamo = MIXAMO52[name];
      if (!mixamo) throw new Error('joint has no Mixamo52 mapping: ' + name);
      return mixamo;
    });
    const parents = [];
    const bones = [];
    for (const name of order) {
      const bone = joints[name];
      bones.push(bone);
      let ancestor = bone.parent;
      let parent = -1;
      while (ancestor) {
        if (boneToJoint.has(ancestor)) { parent = indexOf.get(boneToJoint.get(ancestor)); break; }
        ancestor = ancestor.parent;
      }
      parents.push(parent);
    }

    validate(names, parents);
    assertMixamo52(names);
    return { names, parents, bones };
  }

  // Mirrors reference/skin-tokens retarget.cpp::validate.
  function validate(names, parents) {
    if (names.length < 1 || names.length > 256) {
      throw new Error('skeleton must contain 1..256 joints, got ' + names.length);
    }
    let roots = 0;
    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      if (p < 0) { roots++; continue; }
      if (p >= i) throw new Error('skeleton parents must precede children at joint ' + names[i]);
    }
    if (roots !== 1) throw new Error('skeleton must contain exactly one root, got ' + roots);
  }

  // Build a live line/point view of the rig. `group` is added under the rig root;
  // update() refreshes every segment from the bones' current world transforms.
  function createView(joints, THREE, root) {
    const rig = build(joints);
    const count = rig.names.length;
    const segments = count - 1; // single root => one segment per non-root joint

    const group = new THREE.Group();
    group.name = 'skeleton-view';

    const boneGeom = new THREE.BufferGeometry();
    const bonePos = new Float32Array(segments * 2 * 3);
    boneGeom.setAttribute('position', new THREE.BufferAttribute(bonePos, 3));
    const bones = new THREE.LineSegments(
      boneGeom,
      new THREE.LineBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.9 })
    );
    bones.frustumCulled = false;

    const jointGeom = new THREE.BufferGeometry();
    const jointPos = new Float32Array(count * 3);
    jointGeom.setAttribute('position', new THREE.BufferAttribute(jointPos, 3));
    const jointDots = new THREE.Points(
      jointGeom,
      new THREE.PointsMaterial({ color: 0xffd98a, size: 0.03, sizeAttenuation: true })
    );
    jointDots.frustumCulled = false;

    group.add(bones, jointDots);

    const world = new THREE.Vector3();
    function update() {
      root.updateMatrixWorld(true);
      let s = 0;
      for (let i = 0; i < count; i++) {
        rig.bones[i].getWorldPosition(world);
        group.worldToLocal(world);
        jointPos[i * 3] = world.x;
        jointPos[i * 3 + 1] = world.y;
        jointPos[i * 3 + 2] = world.z;
      }
      for (let i = 0; i < count; i++) {
        const p = rig.parents[i];
        if (p < 0) continue;
        bonePos[s * 6] = jointPos[i * 3];
        bonePos[s * 6 + 1] = jointPos[i * 3 + 1];
        bonePos[s * 6 + 2] = jointPos[i * 3 + 2];
        bonePos[s * 6 + 3] = jointPos[p * 3];
        bonePos[s * 6 + 4] = jointPos[p * 3 + 1];
        bonePos[s * 6 + 5] = jointPos[p * 3 + 2];
        s++;
      }
      jointGeom.attributes.position.needsUpdate = true;
      boneGeom.attributes.position.needsUpdate = true;
    }

    update();
    return { group, update, rig };
  }

  // ponytail: runnable check — a 3-joint chain must validate and reject a cycle/extra root.
  (function selfTest() {
    validate(['Hips', 'Spine', 'Head'], [-1, 0, 1]);
    let threw = false;
    try { validate(['A', 'B'], [-1, -1]); } catch (e) { threw = true; }
    console.assert(threw, '[skeleton] two-root rig must fail validation');
    try { validate(['A', 'B'], [1, -1]); threw = false; } catch (e) { threw = true; }
    console.assert(threw, '[skeleton] child-before-parent must fail validation');
    console.assert(Object.keys(MIXAMO52).length === 52, '[skeleton] Mixamo52 map must have 52 entries');
    console.assert(new Set(Object.values(MIXAMO52)).size === CANONICAL_MIXAMO52.size &&
      Object.values(MIXAMO52).every((n) => CANONICAL_MIXAMO52.has(n)),
      '[skeleton] Mixamo52 map must cover exactly the canonical 52 joints');
  })();

  return { build, validate, createView };
})();


/* ---- render/character.js ---- */
// Human Primitive Legacy skin adapter. Blender exports provide the authored
// mesh, weights, and anatomical joint placement; MotionScript supplies deltas.
window.DANCE = window.DANCE || {};

DANCE.createRig = function createRig(initialProfile) {
  const T = window.THREE;
  const root = new T.Group();
  const loader = new window.GLTFLoader();
  let profileName = initialProfile || 'male';
  let joints = {};
  let restQuaternions = {};
  let pendingPose = DANCE.motionScript.basePose();
  let loadVersion = 0;
  let skeletonView = null;

  const DETAIL = 4; // Males and females both use their own detail-4 body.
  const PROFILES = {
    male: { label: 'Male', height: 1.76 },
    female: { label: 'Female', height: 1.64 }
  };
  const BONE_MAP = {
    hips: 'spine', spine: 'spine001', spine1: 'spine002', spine2: 'spine003', neck: 'spine005', head: 'spine006',
    clavicleL: 'shoulderL', upperArmL: 'upper_armL', lowerArmL: 'forearmL', handL: 'handL',
    clavicleR: 'shoulderR', upperArmR: 'upper_armR', lowerArmR: 'forearmR', handR: 'handR',
    upperLegL: 'thighL', lowerLegL: 'shinL', footL: 'footL',
    upperLegR: 'thighR', lowerLegR: 'shinR', footR: 'footR'
  };
  const FINGER_BONES = { index: 'f_index', middle: 'f_middle', ring: 'f_ring', little: 'f_pinky', thumb: 'thumb' };
  const FINGER_PARTS = { Proximal: '01', Intermediate: '02', Distal: '03' };

  for (const side of DANCE.motionScript.SIDES) {
    for (const finger of DANCE.motionScript.FINGERS) {
      for (const part in FINGER_PARTS) {
        BONE_MAP[finger.toLowerCase() + part + side] =
          FINGER_BONES[finger.toLowerCase()] + FINGER_PARTS[part] + side;
      }
    }
    BONE_MAP['toeBase' + side] = 'toe' + side;
  }

  const api = {
    root,
    profiles: PROFILES,
    onStatus: null,
    get joints() { return joints; },
    get profile() { return profileName; },
    get height() { return PROFILES[profileName].height; },
    setProfile,
    applyPose,
    update() { if (skeletonView) skeletonView.update(); }
  };

  function notify(state, message) {
    if (api.onStatus) api.onStatus(state, message);
  }

  function applyJoint(jointName, value) {
    const bone = joints[jointName];
    if (!bone || !value) return;
    const delta = new T.Quaternion().setFromEuler(new T.Euler(value.rx || 0, value.ry || 0, value.rz || 0));
    bone.quaternion.copy(restQuaternions[jointName]).multiply(delta);
  }

  function applyPose(pose) {
    pendingPose = pose;
    if (!joints.hips) return;

    for (const name of DANCE.motionScript.JOINTS) applyJoint(name, pose[name]);
    const hips = pose.hips;
    root.position.set(hips.px || 0, hips.py || 0, hips.pz || 0);
  }

  function indexBones(model) {
    const bones = {};
    model.traverse((object) => {
      if (object.isBone) bones[object.name] = object;
      else if (object.isMesh) object.visible = false; // skin removed; skeleton only
    });

    joints = {};
    for (const jointName in BONE_MAP) joints[jointName] = bones[BONE_MAP[jointName]];
    restQuaternions = {};
    for (const jointName in joints) {
      if (joints[jointName]) restQuaternions[jointName] = joints[jointName].quaternion.clone();
    }

    const missing = DANCE.motionScript.JOINTS.filter((name) => !joints[name]);
    if (missing.length) throw new Error('Missing authored bones: ' + missing.join(', '));
  }

  function loadBody() {
    const version = ++loadVersion;
    const detail = DETAIL;
    const url = window.DANCE_ASSET_ROOT + 'models/' + profileName + '-' + detail + '.glb?v=' + window.DANCE_ASSET_VERSION;
    notify('loading', 'Loading Human Primitive body...');
    loader.load(url, (gltf) => {
      if (version !== loadVersion) return;
      try {
        indexBones(gltf.scene);
        root.clear();
        skeletonView = null;
        root.position.set(0, 0, 0);
        root.add(gltf.scene);
        root.updateMatrixWorld(true);
        skeletonView = DANCE.skeleton.createView(joints, T, root);
        root.add(skeletonView.group);

        root.userData.profile = profileName;
        root.userData.height = PROFILES[profileName].height;
        root.userData.dimensions = { floor: 0, crown: PROFILES[profileName].height };
        applyPose(pendingPose);
        notify('ready', PROFILES[profileName].label + ' detail ' + detail + ' ready');
      } catch (error) {
        console.error(error);
        notify('error', error.message);
      }
    }, undefined, (error) => {
      if (version !== loadVersion) return;
      console.error(error);
      notify('error', 'Human Primitive model failed to load');
    });
  }

  function setProfile(nextProfile) {
    if (!PROFILES[nextProfile]) return;
    profileName = nextProfile;
    loadBody();
  }

  loadBody();
  return api;
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
// Scene setup: renderer, camera, and lights.
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
// Beat clock for MotionScript v2 keyframe tracks.
window.DANCE = window.DANCE || {};

DANCE.Sequencer = function Sequencer(rig, onFrame) {
  let script = null;
  let beat = 0;
  let playing = false;
  let loop = true;

  function markerAt(atBeat) {
    if (!script || !script.markers) return '-';
    let label = '-';
    for (const marker of script.markers) {
      if (marker.beat > atBeat) break;
      label = marker.label;
    }
    return label;
  }

  function apply() {
    if (script) rig.applyPose(DANCE.motionScript.evaluate(script, beat));
  }

  function emit() {
    if (!onFrame) return;
    onFrame({ beat, total: script ? script.totalBeats : 0, section: markerAt(beat),
      moveName: 'keyframe tracks', bodyState: 'FULL BODY', playing });
  }

  function setScript(nextScript) {
    const result = DANCE.motionScript.validate(nextScript);
    if (!result.ok) throw new Error('Invalid MotionScript: ' + result.errors.join('; '));
    script = nextScript;
    beat = 0;
    playing = false;
    apply();
    emit();
  }

  function clearScript() {
    script = null;
    beat = 0;
    playing = false;
    rig.applyPose(DANCE.motionScript.basePose());
    emit();
  }

  function seekTime(seconds) {
    if (!script || !Number.isFinite(seconds)) return;
    const timeline = script.beatTimeline;
    if (Array.isArray(timeline) && timeline.length >= 2) {
      let time = Math.max(0, seconds);
      const endTime = timeline[timeline.length - 1].timeS;
      if (loop && endTime > 0) time %= endTime;
      if (time <= timeline[0].timeS) beat = timeline[0].beat;
      else {
        let next = 1;
        while (next < timeline.length && timeline[next].timeS <= time) next++;
        if (next >= timeline.length) beat = script.totalBeats;
        else {
          const previous = timeline[next - 1];
          const following = timeline[next];
          const span = following.timeS - previous.timeS;
          const fraction = span > 0 ? (time - previous.timeS) / span : 0;
          beat = previous.beat + (following.beat - previous.beat) * fraction;
        }
      }
    } else {
      beat = Math.max(0, seconds * script.bpm / 60);
    }
    if (loop) beat %= script.totalBeats;
    else beat = Math.min(beat, script.totalBeats);
    apply();
    emit();
  }

  function update(dt) {
    if (!script) return;
    if (playing) {
      beat += dt * script.bpm / 60;
      if (beat >= script.totalBeats) {
        if (loop) beat %= script.totalBeats;
        else { beat = script.totalBeats; playing = false; }
      }
    }
    apply();
    emit();
  }

  return {
    setScript,
    clearScript,
    seekTime,
    play() { if (script) { if (beat >= script.totalBeats) beat = 0; playing = true; } },
    pause() { playing = false; },
    stop() { playing = false; beat = 0; apply(); emit(); },
    setLoop(value) { loop = !!value; },
    update,
    isPlaying() { return playing; },
    hasScript() { return script !== null; },
    getBeat() { return beat; }
  };
};


/* ---- render/selfcheck.js ---- */
// On-load self-check (ponytail's runnable check).
// Validates each generated keyframe script and verifies deterministic diversity.
window.DANCE = window.DANCE || {};

DANCE.selfcheck = function selfcheck(scripts) {
  const results = [];
  let ok = true;

  for (const s of scripts) {
    const v = DANCE.choreographer.validate(s);
    if (!v.ok) ok = false;
    const complete = DANCE.motionScript.JOINTS.every((joint) => s.tracks[joint]);
    if (!complete) ok = false;
    results.push({ seed: s.seed, ok: v.ok && complete, errors: v.errors });
  }

  const sigs = new Set(scripts.map((s) => JSON.stringify(s.tracks.hips)));
  const diverse = sigs.size >= Math.min(2, scripts.length);
  if (!diverse) ok = false;

  const summary = `${results.filter((r) => r.ok).length}/${results.length} scripts valid, 52 joint tracks each, ${sigs.size} distinct`;
  console[ok ? 'log' : 'error']('[selfcheck]', summary, results);
  return { pass: ok, summary, results, distinct: sigs.size };
};


/* ---- main.js ---- */
// App bootstrap: build scene + rig, generate 5 seeds -> 5 scripts, wire UI.
// Called after the vendored THREE module is ready.
DANCE.main = function main() {
  const canvas = document.getElementById('stage');
  const { scene, camera, renderer, resize } = DANCE.createScene(canvas);
  const rig = DANCE.createRig();
  scene.add(rig.root);

  const orbit = DANCE.attachOrbit(camera, renderer.domElement, new THREE.Vector3(0, 0.95, 0));
  DANCE.runtime = { scene, camera, renderer, rig, orbit };

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
  rig.onStatus = (state, message) => {
    hud.status.textContent = message;
    hud.status.className = state === 'error' ? 'fail' : (state === 'ready' ? 'ok' : '');
  };

  const seq = DANCE.Sequencer(rig, (f) => {
    hud.beat.textContent = `${f.beat.toFixed(1)} / ${f.total}`;
    hud.section.textContent = f.section;
    hud.move.textContent = f.moveName;
    hud.state.textContent = `${rig.height.toFixed(2)} m`;
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
      opt.value = String(i);
      opt.textContent = `#${i + 1} · ${s.brief.dance_genre} · ${Object.keys(s.tracks).length} joint tracks`;
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
  document.querySelectorAll('[data-profile]').forEach((button) => {
    button.addEventListener('click', (event) => {
      rig.setProfile(event.currentTarget.dataset.profile);
      document.querySelectorAll('[data-profile]').forEach((option) => {
        option.setAttribute('aria-pressed', String(option === event.currentTarget));
      });
      orbit.target.set(0, rig.height * 0.52, 0);
      hud.state.textContent = `${rig.height.toFixed(2)} m`;
      seq.update(0);
    });
  });

  function setPlayLabel() {
    document.getElementById('play').textContent = seq.isPlaying() ? 'Pause' : 'Play';
  }

  // Render loop
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    seq.update(dt);
    rig.update(dt);
    orbit.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  generate();
  orbit.target.set(0, rig.height * 0.52, 0);
  setPlayLabel();
  tick();
};


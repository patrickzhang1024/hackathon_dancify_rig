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

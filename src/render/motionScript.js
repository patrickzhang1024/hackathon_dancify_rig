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
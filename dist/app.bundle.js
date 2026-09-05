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

  return { GENRE_TO_DANCE, DEMO_SONG, DANCE_GENRES };
})();


/* ---- render/motionScript.js ---- */
// MotionScript v2: independent beat-keyed rotation channels for every joint.
// This module is THREE-free so generated scripts can be validated in tests.
window.DANCE = window.DANCE || {};

DANCE.motionScript = (function () {
  const SIDES = ['L', 'R'];
  const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
  const TOES = ['Big', 'Index', 'Middle', 'Ring', 'Little'];
  const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head'];

  for (const side of SIDES) {
    JOINTS.push('clavicle' + side, 'upperArm' + side, 'lowerArm' + side, 'hand' + side);
    for (const finger of FINGERS) {
      JOINTS.push(
        finger.toLowerCase() + 'Proximal' + side,
        finger.toLowerCase() + 'Intermediate' + side,
        finger.toLowerCase() + 'Distal' + side
      );
    }
    JOINTS.push('upperLeg' + side, 'lowerLeg' + side, 'foot' + side);
    for (const toe of TOES) JOINTS.push('toe' + toe + side);
  }

  const JOINT_SET = new Set(JOINTS);
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const JOINT_LIMITS = {
    hips: [[-0.55, 0.55], [-0.8, 0.8], [-0.45, 0.45]],
    spine: [[-0.45, 0.55], [-0.6, 0.6], [-0.45, 0.45]],
    chest: [[-0.45, 0.55], [-0.7, 0.7], [-0.5, 0.5]],
    neck: [[-0.7, 0.7], [-1.35, 1.35], [-0.65, 0.65]],
    head: [[-0.65, 0.75], [-1.4, 1.4], [-0.7, 0.7]],
    clavicle: [[-0.35, 0.35], [-0.35, 0.35], [-0.45, 0.45]],
    upperArm: [[-2.5, 2.5], [-1.6, 1.6], [-2.6, 2.6]],
    lowerArm: [[-0.15, 2.55], [-0.3, 0.3], [-0.3, 0.3]],
    hand: [[-1.2, 1.2], [-0.7, 0.7], [-0.65, 0.65]],
    finger: [[-0.15, 1.75], [-0.25, 0.25], [-0.25, 0.25]],
    thumb: [[-0.6, 1.35], [-0.75, 0.75], [-0.8, 0.8]],
    upperLeg: [[-1.9, 1.2], [-0.8, 0.8], [-0.75, 0.75]],
    lowerLeg: [[-0.1, 2.45], [-0.18, 0.18], [-0.18, 0.18]],
    foot: [[-0.75, 0.55], [-0.35, 0.35], [-0.45, 0.45]],
    toe: [[-0.6, 0.9], [-0.15, 0.15], [-0.15, 0.15]]
  };
  const easing = {
    linear: (value) => value,
    smooth: (value) => value * value * (3 - 2 * value),
    hold: () => 0
  };

  function limitKey(joint) {
    if (joint.startsWith('thumb')) return 'thumb';
    if (/^(index|middle|ring|little)/.test(joint)) return 'finger';
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

  return { JOINTS, SIDES, FINGERS, TOES, JOINT_LIMITS, basePose, evaluate, validate };
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
    wave('chest', 1, 0.28 * direction, Math.PI, 0.25);
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
      DANCE.motionScript.TOES.forEach((toe, index) => {
        wave('toe' + toe + side, 0, 0.16 + index * 0.02, 0, 0.5);
      });
    }

    return {
      version: 2, seed: brief.seed, brief, title: song.title,
      bpm: song.bpm, beatsPerBar: song.beatsPerBar, totalBeats, markers, tracks
    };
  }

  return { compose, validate: DANCE.motionScript.validate };
})();


/* ---- render/character.js ---- */
// MediaPipe-inspired 3D landmark rig: luminous connection rods and landmark
// spheres form one volumetric body, avoiding overlapping outer-shell geometry.
window.DANCE = window.DANCE || {};

DANCE.createRig = function createRig(initialProfile) {
  const T = window.THREE;
  const root = new T.Group();
  let profileName = initialProfile || 'male';
  let joints = {};
  const componentSelection = { base: 1, head: 3, eye: 1, ear: 2, nose: 2, mouth: 0, teeth: 0, hand: 3, feet: 3 };

  const COMPONENTS = {
    base: ['Detail 1', 'Detail 2', 'Detail 3', 'Detail 4'],
    head: ['Head 1', 'Head 2', 'Head 3', 'Head 4', 'Head 5'],
    eye: ['Bulge', 'Dent', 'Sphere'],
    ear: ['Ear 1', 'Ear 2', 'Ear 3', 'Ear 4', 'Ear 5'],
    nose: ['Nose 1', 'Nose 2', 'Nose 3', 'Nose 4'],
    mouth: ['Lips', 'Lips + teeth style 1', 'Lips + teeth style 2'],
    teeth: ['Style 1', 'Style 2'],
    hand: Array.from({ length: 8 }, (_, index) => 'Hand ' + (index + 1)),
    feet: Array.from({ length: 8 }, (_, index) => 'Feet ' + (index + 1))
  };

  const PROFILES = {
    male: {
      label: 'Male', height: 1.78, shoulder: 0.42, hip: 0.31,
      torso: 0.56, upperArm: 0.32, lowerArm: 0.27,
      upperLeg: 0.46, lowerLeg: 0.45, head: 0.24, build: 1.05
    },
    female: {
      label: 'Female', height: 1.65, shoulder: 0.36, hip: 0.33,
      torso: 0.52, upperArm: 0.29, lowerArm: 0.25,
      upperLeg: 0.43, lowerLeg: 0.415, head: 0.22, build: 0.92
    }
  };

  const connectionMaterial = new T.MeshStandardMaterial({
    color: 0x28d7c7, emissive: 0x073f3b, roughness: 0.32, metalness: 0.08
  });
  const landmarkMaterial = new T.MeshStandardMaterial({
    color: 0xffd166, emissive: 0x5b3900, roughness: 0.25, metalness: 0.05
  });
  const coreMaterial = new T.MeshStandardMaterial({
    color: 0xeafcff, emissive: 0x173f46, roughness: 0.4, transparent: true, opacity: 0.82
  });
  const eyeMaterial = new T.MeshStandardMaterial({ color: 0xf6fbff, roughness: 0.2 });
  const pupilMaterial = new T.MeshStandardMaterial({ color: 0x1b2838, roughness: 0.25 });
  const mouthMaterial = new T.MeshStandardMaterial({ color: 0xb84b5f, roughness: 0.55 });

  function landmark(name, parent, position, radius) {
    const node = new T.Group();
    node.name = name;
    node.position.set(position[0], position[1], position[2]);
    const marker = new T.Mesh(new T.SphereGeometry(radius, 12, 8), landmarkMaterial);
    marker.castShadow = true;
    node.add(marker);
    parent.add(node);
    joints[name] = node;
    return node;
  }

  function connector(parent, end, startRadius, endRadius, material) {
    const vector = new T.Vector3(end[0], end[1], end[2]);
    const mesh = new T.Mesh(
      new T.CylinderGeometry(endRadius, startRadius, vector.length(), 10, 1, false),
      material || connectionMaterial
    );
    mesh.position.copy(vector).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), vector.clone().normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function build(profile) {
    root.clear();
    joints = {};
    const p = PROFILES[profile];
    const ankleY = p.height - p.lowerLeg - p.upperLeg - p.torso - p.head;
    const hipsY = ankleY + p.lowerLeg + p.upperLeg;
    const spineLength = p.torso * 0.46;
    const chestLength = p.torso * 0.38;
    const neckLength = p.torso * 0.16;
    const headRadius = p.head * 0.5;
    const shoulderHalf = p.shoulder * 0.5;
    const hipHalf = p.hip * 0.5;
    const detailScale = 0.94 + componentSelection.base * 0.04;
    const limbRadius = 0.028 * p.build * detailScale;
    const jointRadius = 0.025 * p.build * detailScale;

    const hips = landmark('hips', root, [0, hipsY, 0], jointRadius * 1.15);
    connector(hips, [0, spineLength, 0], 0.055 * p.build, 0.065 * p.build, coreMaterial);
    const spine = landmark('spine', hips, [0, spineLength, 0], jointRadius);
    connector(spine, [0, chestLength, 0], 0.065 * p.build, 0.08 * p.build, coreMaterial);
    const chest = landmark('chest', spine, [0, chestLength, 0], jointRadius * 1.1);
    connector(chest, [0, neckLength, 0], 0.035 * p.build, 0.028 * p.build, coreMaterial);
    const neck = landmark('neck', chest, [0, neckLength, 0], jointRadius * 0.8);
    connector(neck, [0, headRadius, 0], 0.024 * p.build, 0.032 * p.build, coreMaterial);
    const head = landmark('head', neck, [0, headRadius, 0], jointRadius);
    const headVolume = new T.Mesh(new T.SphereGeometry(headRadius, 18, 14), coreMaterial);
    headVolume.position.y = headRadius;
    const headStyle = componentSelection.head - 2;
    headVolume.scale.set(0.76 + headStyle * 0.025, 1 - Math.abs(headStyle) * 0.025, 0.82 + headStyle * 0.018);
    headVolume.castShadow = true;
    head.add(headVolume);

    const eyeRadius = headRadius * (0.075 + componentSelection.eye * 0.008);
    for (const sign of [-1, 1]) {
      const eye = new T.Mesh(new T.SphereGeometry(eyeRadius, 10, 8), eyeMaterial);
      eye.position.set(sign * headRadius * 0.28, headRadius * 1.12, headRadius * 0.72);
      eye.scale.z = componentSelection.eye === 1 ? 0.55 : 0.75;
      head.add(eye);
      const pupil = new T.Mesh(new T.SphereGeometry(eyeRadius * 0.42, 8, 6), pupilMaterial);
      pupil.position.set(0, 0, eyeRadius * 0.72);
      eye.add(pupil);

      const ear = new T.Mesh(new T.SphereGeometry(headRadius * 0.13, 8, 6), coreMaterial);
      ear.position.set(sign * headRadius * 0.78, headRadius * 1.02, 0);
      ear.scale.set(0.45, 0.8 + componentSelection.ear * 0.08, 0.32);
      head.add(ear);
    }
    const nose = new T.Mesh(new T.ConeGeometry(headRadius * (0.07 + componentSelection.nose * 0.012), headRadius * 0.24, 8), coreMaterial);
    nose.position.set(0, headRadius * 0.93, headRadius * 0.78);
    nose.rotation.x = Math.PI / 2;
    head.add(nose);
    const mouth = new T.Mesh(new T.BoxGeometry(headRadius * 0.32, headRadius * 0.045, headRadius * 0.035), mouthMaterial);
    mouth.position.set(0, headRadius * 0.68, headRadius * 0.79);
    mouth.scale.x = 0.88 + componentSelection.mouth * 0.1;
    head.add(mouth);
    if (componentSelection.mouth > 0) {
      const teeth = new T.Mesh(new T.BoxGeometry(headRadius * (0.2 + componentSelection.teeth * 0.035), headRadius * 0.035, headRadius * 0.02), eyeMaterial);
      teeth.position.set(0, -headRadius * 0.015, headRadius * 0.025);
      mouth.add(teeth);
    }

    for (const side of DANCE.motionScript.SIDES) {
      const sign = side === 'L' ? 1 : -1;
      connector(chest, [shoulderHalf * 0.58 * sign, 0.025, 0], limbRadius, limbRadius * 0.9);
      const clavicle = landmark('clavicle' + side, chest, [shoulderHalf * 0.58 * sign, 0.025, 0], jointRadius);
      connector(clavicle, [shoulderHalf * 0.42 * sign, -0.025, 0], limbRadius * 1.15, limbRadius);
      const upperArm = landmark('upperArm' + side, clavicle, [shoulderHalf * 0.42 * sign, -0.025, 0], jointRadius * 1.1);
      connector(upperArm, [0, -p.upperArm, 0], limbRadius * 1.05, limbRadius * 0.82);
      const lowerArm = landmark('lowerArm' + side, upperArm, [0, -p.upperArm, 0], jointRadius);
      connector(lowerArm, [0, -p.lowerArm, 0], limbRadius * 0.82, limbRadius * 0.58);
      const hand = landmark('hand' + side, lowerArm, [0, -p.lowerArm, 0], jointRadius * 0.86);

      const handLength = p.height * 0.062;
      const handWidth = 0.66 + componentSelection.hand * 0.025;
      const palm = new T.Mesh(
        new T.BoxGeometry(handLength * handWidth, handLength * 0.62, handLength * (0.19 + componentSelection.hand * 0.012)),
        coreMaterial
      );
      palm.position.set(0, -handLength * 0.31, 0);
      palm.castShadow = true;
      hand.add(palm);
      const fingerOffsets = [0.036, 0.019, 0, -0.019, -0.036];
      DANCE.motionScript.FINGERS.forEach((finger, index) => {
        const thumb = finger === 'Thumb';
        const first = thumb
          ? [handLength * 0.38 * sign, -handLength * 0.24, handLength * 0.08]
          : [fingerOffsets[index] * sign, -handLength * 0.62, 0];
        const lengths = thumb
          ? [handLength * 0.24, handLength * 0.2, handLength * 0.16]
          : [handLength * 0.28, handLength * 0.22, handLength * 0.17];
        const thumbDirections = [
          [lengths[0] * 0.7 * sign, -lengths[0] * 0.7, lengths[0] * 0.18],
          [lengths[1] * 0.42 * sign, -lengths[1] * 0.9, lengths[1] * 0.12],
          [lengths[2] * 0.28 * sign, -lengths[2] * 0.96, 0]
        ];
        let parent = hand;
        ['Proximal', 'Intermediate', 'Distal'].forEach((part, partIndex) => {
          const offset = partIndex === 0
            ? first
            : (thumb ? thumbDirections[partIndex - 1] : [0, -lengths[partIndex - 1], 0]);
          connector(parent, offset, 0.0055, 0.0045);
          parent = landmark(finger.toLowerCase() + part + side, parent, offset, 0.007);
        });
        connector(parent, thumb ? thumbDirections[2] : [0, -lengths[2], 0], 0.0045, 0.0025);
      });

      connector(hips, [hipHalf * sign, -0.025, 0], limbRadius * 1.35, limbRadius * 1.2, coreMaterial);
      const upperLeg = landmark('upperLeg' + side, hips, [hipHalf * sign, -0.025, 0], jointRadius * 1.2);
      connector(upperLeg, [0, -p.upperLeg, 0], limbRadius * 1.55, limbRadius * 1.1);
      const lowerLeg = landmark('lowerLeg' + side, upperLeg, [0, -p.upperLeg, 0], jointRadius * 1.1);
      connector(lowerLeg, [0, -p.lowerLeg, 0], limbRadius * 1.1, limbRadius * 0.72);
      const foot = landmark('foot' + side, lowerLeg, [0, -p.lowerLeg, 0], jointRadius);
      const footLength = p.height * (0.132 + componentSelection.feet * 0.004);
      connector(foot, [0, -0.02, footLength * 0.72], limbRadius * 0.9, limbRadius * 0.62);

      const toeOffsets = [0.04, 0.021, 0, -0.021, -0.04];
      DANCE.motionScript.TOES.forEach((toe, index) => {
        const offset = [toeOffsets[index] * sign, -0.02, footLength * (0.72 + (index === 0 ? 0.04 : 0))];
        connector(foot, offset, 0.0065, 0.005);
        const toeJoint = landmark('toe' + toe + side, foot, offset, 0.007);
        connector(toeJoint, [0, 0, footLength * (0.24 - index * 0.018)], 0.005, 0.0025);
      });
    }

    root.userData.profile = profile;
    root.userData.height = p.height;
    root.userData.dimensions = { floor: 0, crown: hipsY + p.torso + p.head };
  }

  function applyPose(pose) {
    for (const name of DANCE.motionScript.JOINTS) {
      const value = pose[name];
      if (joints[name] && value) joints[name].rotation.set(value.rx || 0, value.ry || 0, value.rz || 0);
    }
    const value = pose.hips;
    const restY = joints.hips.userData.restY;
    joints.hips.position.set(value.px || 0, restY + (value.py || 0), value.pz || 0);
  }

  function setProfile(nextProfile) {
    if (!PROFILES[nextProfile]) return;
    profileName = nextProfile;
    build(profileName);
    joints.hips.userData.restY = joints.hips.position.y;
    applyPose(DANCE.motionScript.basePose());
  }

  function setComponent(category, variant) {
    if (!COMPONENTS[category] || !COMPONENTS[category][variant]) return;
    componentSelection[category] = variant;
    setProfile(profileName);
  }

  setProfile(profileName);
  return {
    root,
    profiles: PROFILES,
    components: COMPONENTS,
    componentSelection,
    get joints() { return joints; },
    get profile() { return profileName; },
    get height() { return PROFILES[profileName].height; },
    setProfile,
    setComponent,
    applyPose,
    update() {}
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
    play() { if (script) { if (beat >= script.totalBeats) beat = 0; playing = true; } },
    pause() { playing = false; },
    stop() { playing = false; beat = 0; apply(); emit(); },
    setLoop(value) { loop = !!value; },
    update,
    isPlaying() { return playing; }
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

  const summary = `${results.filter((r) => r.ok).length}/${results.length} scripts valid, 59 joint tracks each, ${sigs.size} distinct`;
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
    hud.state.textContent = `${rig.height.toFixed(2)} m`;
    // pulse the beat dot on each beat
    const frac = f.beat - Math.floor(f.beat);
    hud.dot.style.transform = `scale(${1 + (1 - frac) * 0.8})`;
    hud.dot.style.opacity = String(0.35 + (1 - frac) * 0.65);
  });
  seq.setLoop(true);

  let scripts = [];
  const componentCategory = document.getElementById('componentCategory');
  const componentVariant = document.getElementById('componentVariant');
  const componentLabels = {
    base: 'Base mesh', head: 'Head', eye: 'Eyes', ear: 'Ears', nose: 'Nose',
    mouth: 'Mouth', teeth: 'Teeth', hand: 'Hands', feet: 'Feet'
  };

  for (const category in rig.components) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = componentLabels[category];
    componentCategory.appendChild(option);
  }

  function refreshComponentVariants() {
    const category = componentCategory.value;
    componentVariant.innerHTML = '';
    rig.components[category].forEach((label, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = label;
      option.selected = index === rig.componentSelection[category];
      componentVariant.appendChild(option);
    });
  }
  refreshComponentVariants();

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
  componentCategory.addEventListener('change', refreshComponentVariants);
  componentVariant.addEventListener('change', (event) => {
    rig.setComponent(componentCategory.value, Number(event.target.value));
    seq.update(0);
  });
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


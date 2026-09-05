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
    hips: [[-0.45, 0.45], [-0.7, 0.7], [-0.4, 0.4]],
    spine: [[-0.35, 0.45], [-0.45, 0.45], [-0.35, 0.35]],
    chest: [[-0.35, 0.45], [-0.55, 0.55], [-0.4, 0.4]],
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
  const componentVersions = {};
  const attachments = {};

  const componentSelection = { base: 3, hand: 0, feet: 0 };
  const COMPONENTS = {
    base: ['Detail 1', 'Detail 2', 'Detail 3', 'Detail 4'],
    hand: ['None'].concat(Array.from({ length: 8 }, (_, index) => 'Hand ' + (index + 1))),
    feet: ['None'].concat(Array.from({ length: 8 }, (_, index) => 'Feet ' + (index + 1)))
  };
  const PROFILES = {
    male: { label: 'Male', height: 1.76 },
    female: { label: 'Female', height: 1.64 }
  };
  const BONE_MAP = {
    hips: 'spine', spine: 'spine001', chest: 'spine003', neck: 'spine005', head: 'spine006',
    clavicleL: 'shoulderL', upperArmL: 'upper_armL', lowerArmL: 'forearmL', handL: 'handL',
    clavicleR: 'shoulderR', upperArmR: 'upper_armR', lowerArmR: 'forearmR', handR: 'handR',
    upperLegL: 'thighL', lowerLegL: 'shinL', footL: 'footL',
    upperLegR: 'thighR', lowerLegR: 'shinR', footR: 'footR'
  };
  const FINGER_BONES = { index: 'f_index', middle: 'f_middle', ring: 'f_ring', little: 'f_pinky', thumb: 'thumb' };
  const FINGER_PARTS = { Proximal: '01', Intermediate: '02', Distal: '03' };
  const MATERIALS = {
    skin: new T.MeshStandardMaterial({ color: 0xc88f78, roughness: 0.78, metalness: 0 })
  };
  const COMPONENT_FITS = {
    hand: { bones: ['handL', 'handR'], size: [0.1, 0.17, 0.04], position: [0, 0.08, 0], mirrorSecond: true },
    feet: { bones: ['footL', 'footR'], size: [0.11, 0.25, 0.08], position: [0, 0.1, 0], mirrorSecond: true }
  };

  for (const side of DANCE.motionScript.SIDES) {
    for (const finger of DANCE.motionScript.FINGERS) {
      for (const part in FINGER_PARTS) {
        BONE_MAP[finger.toLowerCase() + part + side] =
          FINGER_BONES[finger.toLowerCase()] + FINGER_PARTS[part] + side;
      }
    }
  }

  const api = {
    root,
    profiles: PROFILES,
    components: COMPONENTS,
    componentSelection,
    onStatus: null,
    get joints() { return joints; },
    get profile() { return profileName; },
    get height() { return PROFILES[profileName].height; },
    setProfile,
    setComponent,
    applyPose,
    update() {}
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

    for (const name of DANCE.motionScript.JOINTS) {
      if (!name.startsWith('toe')) applyJoint(name, pose[name]);
    }
    for (const side of DANCE.motionScript.SIDES) {
      const toe = joints['toe' + side];
      if (!toe) continue;
      const values = DANCE.motionScript.TOES.map((name) => pose['toe' + name + side]);
      const average = (axis) => values.reduce((sum, value) => sum + (value[axis] || 0), 0) / values.length;
      applyJoint('toe' + side, { rx: average('rx'), ry: average('ry'), rz: average('rz') });
    }
    const hips = pose.hips;
    root.position.set(hips.px || 0, hips.py || 0, hips.pz || 0);
  }

  function indexBones(model) {
    const bones = {};
    model.traverse((object) => {
      if (object.isBone) bones[object.name] = object;
      if (object.isMesh) {
        object.material = MATERIALS.skin;
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    joints = {};
    for (const jointName in BONE_MAP) joints[jointName] = bones[BONE_MAP[jointName]];
    for (const side of DANCE.motionScript.SIDES) {
      const toe = bones['toe' + side];
      joints['toe' + side] = toe;
      for (const name of DANCE.motionScript.TOES) joints['toe' + name + side] = toe;
    }
    restQuaternions = {};
    for (const jointName in joints) {
      if (joints[jointName]) restQuaternions[jointName] = joints[jointName].quaternion.clone();
    }

    const missing = DANCE.motionScript.JOINTS.filter((name) => !joints[name]);
    if (missing.length) throw new Error('Missing authored bones: ' + missing.join(', '));
  }

  function removeAttachments(category) {
    for (const object of attachments[category] || []) object.removeFromParent();
    attachments[category] = [];
  }

  function fitComponent(model, targetSize) {
    model.updateMatrixWorld(true);
    const size = new T.Box3().setFromObject(model).getSize(new T.Vector3());
    model.scale.set(
      targetSize[0] / size.x,
      targetSize[1] / size.y,
      targetSize[2] / size.z
    );
  }

  function attachComponent(category, source) {
    const fit = COMPONENT_FITS[category];
    removeAttachments(category);
    const boneNames = fit.bones || (fit.positions ? fit.positions.map(() => fit.bone) : [fit.bone]);
    const positions = fit.positions || boneNames.map(() => fit.position);
    boneNames.forEach((boneName, index) => {
      const holder = new T.Group();
      const model = source.clone(true);
      fitComponent(model, fit.size);
      if (fit.mirrorSecond && index === 1) model.scale.x *= -1;
      if (fit.rotation) model.rotation.set(fit.rotation[0], fit.rotation[1], fit.rotation[2]);
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.material = MATERIALS[category] || MATERIALS.skin;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      holder.position.set(positions[index][0], positions[index][1], positions[index][2]);
      holder.add(model);
      joints[boneName].add(holder);
      attachments[category].push(holder);
    });
  }

  function loadComponent(category) {
    if (!joints.hips) return;
    const version = (componentVersions[category] || 0) + 1;
    componentVersions[category] = version;
    removeAttachments(category);
    if (componentSelection[category] === 0) return;
    const variant = componentSelection[category];
    const url = window.DANCE_ASSET_ROOT + 'components/' + category + '-' + variant + '.glb?v=' + window.DANCE_ASSET_VERSION;
    loader.load(url, (gltf) => {
      if (componentVersions[category] !== version) return;
      attachComponent(category, gltf.scene);
    }, undefined, (error) => {
      if (componentVersions[category] !== version) return;
      console.error(error);
      notify('error', 'Failed to load ' + category + ' component');
    });
  }

  function loadComponents() {
    for (const category in COMPONENT_FITS) loadComponent(category);
  }

  function loadBody() {
    const version = ++loadVersion;
    const detail = componentSelection.base + 1;
    const url = window.DANCE_ASSET_ROOT + 'models/' + profileName + '-' + detail + '.glb?v=' + window.DANCE_ASSET_VERSION;
    notify('loading', 'Loading Human Primitive body...');
    loader.load(url, (gltf) => {
      if (version !== loadVersion) return;
      try {
        indexBones(gltf.scene);
        root.clear();
        root.position.set(0, 0, 0);
        root.add(gltf.scene);

        root.userData.profile = profileName;
        root.userData.height = PROFILES[profileName].height;
        root.userData.dimensions = { floor: 0, crown: PROFILES[profileName].height };
        applyPose(pendingPose);
        loadComponents();
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

  function setComponent(category, variant) {
    if (!COMPONENTS[category] || !COMPONENTS[category][variant]) return;
    componentSelection[category] = variant;
    if (category === 'base') loadBody();
    else loadComponent(category);
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
  const componentCategory = document.getElementById('componentCategory');
  const componentVariant = document.getElementById('componentVariant');
  const componentLabels = {
    base: 'Human body', hand: 'Hands', feet: 'Feet'
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


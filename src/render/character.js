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

        const skeleton = new T.SkeletonHelper(gltf.scene);
        skeleton.material.depthTest = false;
        skeleton.material.transparent = true;
        skeleton.material.opacity = 0.22;
        root.add(skeleton);

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

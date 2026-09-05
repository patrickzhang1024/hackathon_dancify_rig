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
    // showSkin: the female export carries a skinned mesh; the male asset is
    // still skeleton-only, so its unrigged mesh parts stay hidden.
    male: { label: 'Male', height: 1.76, showSkin: false },
    female: { label: 'Female', height: 1.7018, showSkin: true }
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
    const showSkin = PROFILES[profileName].showSkin === true;
    model.traverse((object) => {
      if (object.isBone) bones[object.name] = object;
      else if (object.isMesh) object.visible = showSkin;
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

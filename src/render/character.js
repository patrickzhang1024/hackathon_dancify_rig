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

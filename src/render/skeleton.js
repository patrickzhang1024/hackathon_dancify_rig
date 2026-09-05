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

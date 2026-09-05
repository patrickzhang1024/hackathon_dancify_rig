// Procedural humanoid rig (Theme 3 character).
// A joint hierarchy of Groups + primitive meshes. No skinning / external assets,
// so poses are driven by setting joint rotations directly.
window.DANCE = window.DANCE || {};

DANCE.createRig = function createRig() {
  const T = window.THREE;
  const skin = new T.MeshStandardMaterial({ color: 0xf1c9a5, roughness: 0.8 });
  const body = new T.MeshStandardMaterial({ color: 0x3a7bd5, roughness: 0.6, metalness: 0.1 });
  const limb = new T.MeshStandardMaterial({ color: 0x2b5fa8, roughness: 0.6 });
  const dark = new T.MeshStandardMaterial({ color: 0x1f2933, roughness: 0.7 });

  const root = new T.Group();
  const joints = {};

  function joint(parent, x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }
  function addLimb(parent, length, radius, mat) {
    const m = new T.Mesh(new T.CylinderGeometry(radius, radius * 0.85, length, 12), mat);
    m.position.y = -length / 2;
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function addBox(parent, w, h, d, x, y, z, mat) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function addSphere(parent, r, x, y, z, mat) {
    const m = new T.Mesh(new T.SphereGeometry(r, 16, 12), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  const restY = 0.9;

  // Torso chain
  joints.hips = joint(root, 0, restY, 0);
  addBox(joints.hips, 0.26, 0.16, 0.16, 0, 0, 0, body);
  joints.spine = joint(joints.hips, 0, 0.14, 0);
  addBox(joints.spine, 0.30, 0.34, 0.18, 0, 0.18, 0, body);
  joints.chest = joint(joints.spine, 0, 0.36, 0);
  joints.head = joint(joints.chest, 0, 0.06, 0);
  addSphere(joints.head, 0.12, 0, 0.13, skin);

  // Arms (hang down at rest along -Y)
  joints.armL = joint(joints.chest, 0.19, 0.0, 0);
  addLimb(joints.armL, 0.26, 0.045, limb);
  joints.forearmL = joint(joints.armL, 0, -0.26, 0);
  addLimb(joints.forearmL, 0.24, 0.04, limb);
  addSphere(joints.forearmL, 0.05, 0, -0.26, skin);

  joints.armR = joint(joints.chest, -0.19, 0.0, 0);
  addLimb(joints.armR, 0.26, 0.045, limb);
  joints.forearmR = joint(joints.armR, 0, -0.26, 0);
  addLimb(joints.forearmR, 0.24, 0.04, limb);
  addSphere(joints.forearmR, 0.05, 0, -0.26, skin);

  // Legs
  joints.legL = joint(joints.hips, 0.10, -0.02, 0);
  addLimb(joints.legL, 0.40, 0.06, limb);
  joints.shinL = joint(joints.legL, 0, -0.40, 0);
  addLimb(joints.shinL, 0.40, 0.05, limb);
  addBox(joints.shinL, 0.10, 0.06, 0.24, 0, -0.42, 0.06, dark);

  joints.legR = joint(joints.hips, -0.10, -0.02, 0);
  addLimb(joints.legR, 0.40, 0.06, limb);
  joints.shinR = joint(joints.legR, 0, -0.40, 0);
  addLimb(joints.shinR, 0.40, 0.05, limb);
  addBox(joints.shinR, 0.10, 0.06, 0.24, 0, -0.42, 0.06, dark);

  const rest = { x: 0, y: restY, z: 0 };

  function applyPose(pose) {
    for (const name of DANCE.moves.JOINTS) {
      const j = joints[name];
      const p = pose[name];
      if (!j || !p) continue;
      j.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    }
    const h = pose.hips;
    joints.hips.position.set(rest.x + (h.px || 0), rest.y + (h.py || 0), rest.z + (h.pz || 0));
  }

  // Start in idle rest.
  applyPose(DANCE.moves.basePose());

  return { root, joints, applyPose, restY, isVRM: false, update() {} };
};

// VRM-backed humanoid rig. Same public interface as createRig (applyPose/update)
// but drives a real human VRM model with joint limits, fingers and secondary
// physics. Retarget math verified in test/vrm-calib.html:
//   Q_local = A_parent * Euler(rx,ry,rz,'XYZ') * A_bone^-1
// because every normalized VRM bone is world-axis-aligned at rest and the only
// difference from the primitive rig is that arms rest sideways (±X) instead of
// hanging (-Y). A = identity everywhere except the arms (a ±90° roll about Z).
DANCE.createRigVRM = function createRigVRM(vrm) {
  const T = window.THREE;
  const h = vrm.humanoid;
  const spring = DANCE.springs.create();

  const I = new T.Quaternion();
  const Rz = (deg) => new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), deg * Math.PI / 180);
  const Ll = Rz(90), LlInv = Rz(-90), Rr = Rz(-90), RrInv = Rz(90);

  // primitive joint -> {bone, aPar, aInv}
  const MAP = [
    { p: 'hips', b: 'hips', aPar: I, aInv: I, hips: true },
    { p: 'spine', b: 'spine', aPar: I, aInv: I },
    { p: 'chest', b: 'chest', aPar: I, aInv: I },
    { p: 'head', b: 'head', aPar: I, aInv: I },
    { p: 'armL', b: 'leftUpperArm', aPar: I, aInv: LlInv },
    { p: 'forearmL', b: 'leftLowerArm', aPar: Ll, aInv: LlInv },
    { p: 'armR', b: 'rightUpperArm', aPar: I, aInv: RrInv },
    { p: 'forearmR', b: 'rightLowerArm', aPar: Rr, aInv: RrInv },
    { p: 'legL', b: 'leftUpperLeg', aPar: I, aInv: I },
    { p: 'shinL', b: 'leftLowerLeg', aPar: I, aInv: I },
    { p: 'legR', b: 'rightUpperLeg', aPar: I, aInv: I },
    { p: 'shinR', b: 'rightLowerLeg', aPar: I, aInv: I }
  ];
  for (const m of MAP) m.node = h.getNormalizedBoneNode(m.b);

  const hipsNode = h.getNormalizedBoneNode('hips');
  const restHips = hipsNode ? hipsNode.position.clone() : new T.Vector3();

  const tmpE = new T.Euler();
  const qd = new T.Quaternion();
  const ZERO = { rx: 0, ry: 0, rz: 0 };
  let curHands = 'relaxed';

  function applyPose(pose, dt) {
    DANCE.rigLimits.clamp(pose);
    if (typeof dt === 'number') spring.update(pose, dt);

    for (const m of MAP) {
      if (!m.node) continue;
      const p = pose[m.p] || ZERO;
      tmpE.set(p.rx || 0, p.ry || 0, p.rz || 0, 'XYZ');
      qd.setFromEuler(tmpE);
      m.node.quaternion.copy(m.aPar).multiply(qd).multiply(m.aInv);
      if (m.hips) {
        m.node.position.set(
          restHips.x + (p.px || 0),
          restHips.y + (p.py || 0),
          restHips.z + (p.pz || 0)
        );
      }
    }

    const hands = pose.hands || 'relaxed';
    if (hands !== curHands) curHands = hands;
    DANCE.fingers.apply(h, curHands);
  }

  applyPose(DANCE.moves.basePose());

  return {
    root: vrm.scene,
    applyPose,
    update(dt) { vrm.update(typeof dt === 'number' ? dt : 0); },
    isVRM: true
  };
};

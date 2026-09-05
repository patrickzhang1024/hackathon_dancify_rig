// Anatomical joint limits — the anti-反关节 (reverse-joint) safety net.
// Operates on the plain pose object {joint:{rx,ry,rz}} BEFORE it is retargeted
// onto the VRM humanoid, so it stays THREE-free and unit-testable.
//
// Ranges are intentionally generous: they contain every angle the authored moves
// produce, and only bite when intensity/amp scaling, facing offsets or crossfade
// blending push a joint past a plausible human range (which is exactly when a
// knee or elbow would otherwise visibly invert).
window.DANCE = window.DANCE || {};

DANCE.rigLimits = (function () {
  // [min, max] radians per axis, in the primitive rig convention
  // (all limbs rest along -Y, joint frames world-aligned).
  const L = {
    hips:      { rx: [-0.6, 0.6],  ry: [-Math.PI, Math.PI], rz: [-0.5, 0.5] }, // ry free: facing + spin
    spine:     { rx: [-0.5, 0.7],  ry: [-0.6, 0.6],  rz: [-0.4, 0.4] },
    chest:     { rx: [-0.4, 0.5],  ry: [-0.75, 0.75], rz: [-0.4, 0.4] },
    head:      { rx: [-0.5, 0.5],  ry: [-0.85, 0.85], rz: [-0.5, 0.5] },
    // Shoulders: wide cone. Left/right mirror the rz (abduction) range.
    armL:      { rx: [-2.95, 0.9], ry: [-1.3, 1.3],  rz: [-0.35, 1.9] },
    armR:      { rx: [-2.95, 0.9], ry: [-1.3, 1.3],  rz: [-1.9, 0.35] },
    // Elbows: hinge. Cannot hyperextend past straight (small +epsilon only).
    forearmL:  { rx: [-2.7, 0.08], ry: [-1.3, 1.3],  rz: [-0.4, 0.4] },
    forearmR:  { rx: [-2.7, 0.08], ry: [-1.3, 1.3],  rz: [-0.4, 0.4] },
    // Hips (thighs): flexion big, abduction moderate.
    legL:      { rx: [-1.9, 1.3],  ry: [-0.6, 0.6],  rz: [-0.5, 0.6] },
    legR:      { rx: [-1.9, 1.3],  ry: [-0.6, 0.6],  rz: [-0.6, 0.5] },
    // Knees: hinge. Allow deep flex (sit/floor/tuck) but no reverse bend.
    shinL:     { rx: [-1.7, 2.0],  ry: [-0.4, 0.4],  rz: [-0.35, 0.35] },
    shinR:     { rx: [-1.7, 2.0],  ry: [-0.4, 0.4],  rz: [-0.35, 0.35] }
  };

  const clampVal = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // Mutates pose in place; returns it. hips position offsets are left untouched.
  function clamp(pose) {
    for (const name in L) {
      const p = pose[name];
      if (!p) continue;
      const lim = L[name];
      if (typeof p.rx === 'number') p.rx = clampVal(p.rx, lim.rx[0], lim.rx[1]);
      if (typeof p.ry === 'number') p.ry = clampVal(p.ry, lim.ry[0], lim.ry[1]);
      if (typeof p.rz === 'number') p.rz = clampVal(p.rz, lim.rz[0], lim.rz[1]);
    }
    return pose;
  }

  return { clamp, limits: L };
})();

// Lightweight secondary motion — the "发力 / weight" feel on top of the crisp
// choreography. Two effects, both pure math (THREE-free, testable):
//   1. Weight shift: when the hips slide sideways, the upper body counter-leans
//      (centre-of-mass stays over the feet), like a real dancer shifting weight.
//   2. Follow-through: a slightly under-damped spring drags the chest/head behind
//      the driven pose, so the upper body overshoots and settles instead of
//      snapping — momentum, not teleport.
// Arms and legs are left crisp so the dance stays sharp; the real skirt/hair
// momentum comes from the VRM spring bones (vrm.update).
window.DANCE = window.DANCE || {};

DANCE.springs = (function () {
  // [joint, axis, stiffness, damping]. damping < 2*sqrt(stiffness) => overshoot.
  const CHANNELS = [
    ['chest', 'rz', 95, 13],
    ['chest', 'ry', 95, 13],
    ['head', 'rz', 120, 15],
    ['head', 'ry', 120, 15],
    ['spine', 'rz', 90, 14]
  ];

  function create() {
    const state = {}; // key -> {x, v}
    for (const [j, a] of CHANNELS) state[j + '.' + a] = { x: 0, v: 0 };

    function reset(pose) {
      for (const [j, a] of CHANNELS) {
        const s = state[j + '.' + a];
        s.x = (pose && pose[j] && pose[j][a]) || 0;
        s.v = 0;
      }
    }

    // Mutates pose in place. dt already clamped by the render loop.
    function update(pose, dt) {
      if (dt <= 0) return pose;
      // 1. weight shift: counter-lean the spine against lateral hip travel.
      const px = (pose.hips && pose.hips.px) || 0;
      if (pose.spine) pose.spine.rz = (pose.spine.rz || 0) - 0.45 * px;

      // 2. spring follow-through on the secondary channels.
      for (const [j, a, k, c] of CHANNELS) {
        if (!pose[j]) continue;
        const s = state[j + '.' + a];
        const target = pose[j][a] || 0;
        s.v += (k * (target - s.x) - c * s.v) * dt;
        s.x += s.v * dt;
        pose[j][a] = s.x;
      }
      return pose;
    }

    return { update, reset };
  }

  return { create, CHANNELS };
})();

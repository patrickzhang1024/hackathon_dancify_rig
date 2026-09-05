// Finger control for the VRM hand. Fine finger articulation the primitive rig
// never had. Presets are pure data (curl amount per finger 0..1); apply() maps
// them onto the VRM humanoid finger bones.
//
// Curl axis: local Z. Verified sign — LEFT curls on negative Z, RIGHT on positive.
window.DANCE = window.DANCE || {};

DANCE.fingers = (function () {
  const FINGERS = ['Index', 'Middle', 'Ring', 'Little'];
  // Per-joint curl gain (radians at curl = 1). Distal knuckles bend most.
  const JOINT_GAIN = { Proximal: 1.05, Intermediate: 1.5, Distal: 0.9 };
  const THUMB_GAIN = { Metacarpal: 0.25, Proximal: 0.55, Distal: 0.7 };

  // Curl amount per finger + thumb for each named hand pose.
  const PRESETS = {
    relaxed: { Index: 0.28, Middle: 0.32, Ring: 0.38, Little: 0.45, thumb: 0.18 },
    open:    { Index: 0.02, Middle: 0.02, Ring: 0.02, Little: 0.02, thumb: 0.02 },
    spread:  { Index: 0.0,  Middle: 0.0,  Ring: 0.0,  Little: 0.0,  thumb: 0.0 },
    fist:    { Index: 1.0,  Middle: 1.0,  Ring: 1.0,  Little: 1.0,  thumb: 0.7 },
    point:   { Index: 0.0,  Middle: 1.0,  Ring: 1.0,  Little: 1.0,  thumb: 0.55 }
  };

  function presetOf(name) {
    return PRESETS[name] || PRESETS.relaxed;
  }

  // Apply a preset to both hands of the VRM. `humanoid` = vrm.humanoid.
  // getNode(name) returns the normalized bone node or null.
  function apply(humanoid, presetName) {
    const preset = presetOf(presetName);
    for (const side of ['left', 'right']) {
      const sign = side === 'left' ? -1 : 1; // curl direction on local Z
      // four fingers
      for (const finger of FINGERS) {
        const amt = preset[finger] ?? 0;
        for (const joint in JOINT_GAIN) {
          const node = humanoid.getNormalizedBoneNode(side + finger + joint);
          if (node) node.rotation.set(0, 0, sign * JOINT_GAIN[joint] * amt);
        }
      }
      // thumb: curls toward the palm on a blended axis (Z with a little Y splay)
      const t = preset.thumb ?? 0;
      for (const joint in THUMB_GAIN) {
        const node = humanoid.getNormalizedBoneNode(side + 'Thumb' + joint);
        if (node) node.rotation.set(0, sign * 0.35 * t, sign * THUMB_GAIN[joint] * t);
      }
    }
  }

  return { apply, presetOf, PRESETS };
})();

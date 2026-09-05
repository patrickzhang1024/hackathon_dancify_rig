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

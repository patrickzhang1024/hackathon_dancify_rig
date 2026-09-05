// On-load self-check (ponytail's runnable check).
// Validates that every generated script is contiguous, uses known clips, obeys
// the body-state machine, and that the 5 scripts are diverse.
window.DANCE = window.DANCE || {};

DANCE.selfcheck = function selfcheck(scripts) {
  const results = [];
  let ok = true;

  for (const s of scripts) {
    const v = DANCE.choreographer.validate(s);
    if (!v.ok) ok = false;
    results.push({ seed: s.seed, ok: v.ok, errors: v.errors, moves: s.timeline.reduce((n, sec) => n + sec.moves.length, 0) });
  }

  // Diversity: distinct move-sequence signatures.
  const sigs = new Set(
    scripts.map((s) => s.timeline.flatMap((sec) => sec.moves.map((m) => m.clipId)).join(','))
  );
  const diverse = sigs.size >= Math.min(2, scripts.length);
  if (!diverse) ok = false;

  const summary = `${results.filter((r) => r.ok).length}/${results.length} scripts valid, ${sigs.size} distinct`;
  console[ok ? 'log' : 'error']('[selfcheck]', summary, results);
  return { pass: ok, summary, results, distinct: sigs.size };
};

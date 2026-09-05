// Rig test-script runner — pure logic, no THREE, no build step.
// Generates many hash-random scripts and asserts the choreographer contract.
(function () {
  const results = [];
  const assert = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail || '' });

  const song = DANCE.constants.DEMO_SONG;
  const flatMoves = (script) => script.timeline.flatMap((s) => s.moves);

  // 1. Bulk validity + diversity over N random seeds.
  const N = 50;
  const seeds = DANCE.seeds.randomStrings(N);
  let valid = 0;
  const fails = [];
  const signatures = new Set();
  for (const s of seeds) {
    const script = DANCE.choreographer.compose(DANCE.seeds.seedToBrief(s), song);
    const v = DANCE.choreographer.validate(script);
    if (v.ok) valid++; else fails.push({ seed: s, errors: v.errors });
    signatures.add(flatMoves(script).map((m) => m.clipId).join(','));
  }
  assert(`all ${N} random scripts valid`, valid === N, fails.length ? JSON.stringify(fails.slice(0, 2)) : '');
  assert('scripts are diverse (>1 distinct)', signatures.size > 1, `${signatures.size} distinct`);

  // 2. Determinism — same seed yields byte-identical script.
  const fixed = 'rigtest-fixed-seed';
  const brief = DANCE.seeds.seedToBrief(fixed);
  const a = JSON.stringify(DANCE.choreographer.compose(brief, song));
  const b = JSON.stringify(DANCE.choreographer.compose(DANCE.seeds.seedToBrief(fixed), song));
  assert('deterministic for a fixed seed', a === b);

  // 3. Only known clip ids are referenced.
  const known = new Set(DANCE.moves.list.map((m) => m.id));
  const sample = DANCE.choreographer.compose(brief, song);
  const allKnown = flatMoves(sample).every((m) => known.has(m.clipId));
  assert('only known clipIds used', allKnown);

  // 4. Timeline contiguous: starts at 0, no gaps/overlaps, ends at totalBeats.
  let exp = 0, contig = true;
  for (const m of flatMoves(sample)) {
    if (Math.abs(m.startBeat - exp) > 1e-6) { contig = false; break; }
    exp = m.startBeat + m.durationBeats;
  }
  assert('timeline contiguous', contig && Math.abs(exp - sample.totalBeats) < 1e-6, `end ${exp} / total ${sample.totalBeats}`);

  // 5. Legal state machine that returns to STAND (validate is source of truth).
  assert('ends in STAND via legal transitions', DANCE.choreographer.validate(sample).ok);

  // 6. rigLimits.clamp — the anti-反关节 net. Elbows can't hyperextend and
  //    out-of-range angles get pulled back into the anatomical window.
  {
    const L = DANCE.rigLimits.limits;
    const pose = {
      forearmL: { rx: 1.0, ry: 0, rz: 0 },   // way past the +0.08 elbow stop
      shinR:    { rx: -5.0, ry: 0, rz: 0 },  // past the -1.7 knee reverse limit
      armR:     { rx: 0, ry: 0, rz: 1.5 },   // past the +0.35 right-shoulder limit
      head:     { rx: 0.1, ry: 0.2, rz: 0.1 } // in range — must be untouched
    };
    const before = JSON.parse(JSON.stringify(pose.head));
    DANCE.rigLimits.clamp(pose);
    const inRange = (v, lim) => v >= lim[0] - 1e-9 && v <= lim[1] + 1e-9;
    const ok =
      pose.forearmL.rx === L.forearmL.rx[1] &&      // clamped to max (no hyperextend)
      pose.shinR.rx === L.shinR.rx[0] &&            // clamped to min (no reverse knee)
      pose.armR.rz === L.armR.rz[1] &&              // clamped to max
      inRange(pose.forearmL.rx, L.forearmL.rx) &&
      JSON.stringify(pose.head) === JSON.stringify(before); // in-range left alone
    assert('rigLimits clamps reverse joints, keeps in-range angles', ok,
      `forearmL.rx=${pose.forearmL.rx} shinR.rx=${pose.shinR.rx}`);
  }

  // 7. fingers presets — sign + gain mapping onto a mock humanoid.
  //    LEFT curls on -Z, RIGHT on +Z; a fist curls hard, spread is ~0.
  {
    const rec = {}; // boneName -> {x,y,z}
    const mockHumanoid = {
      getNormalizedBoneNode(name) {
        const node = { rotation: { set(x, y, z) { rec[name] = { x, y, z }; } } };
        return node;
      }
    };
    DANCE.fingers.apply(mockHumanoid, 'fist');
    const li = rec['leftIndexProximal'], ri = rec['rightIndexProximal'];
    const fistOk = li && ri && li.z < -0.5 && ri.z > 0.5; // opposite signs, strong curl

    DANCE.fingers.apply(mockHumanoid, 'spread');
    const spreadOk = Math.abs(rec['leftIndexProximal'].z) < 1e-6;

    const knownPreset = DANCE.fingers.presetOf('point').Index === 0 &&
      DANCE.fingers.presetOf('nonexistent') === DANCE.fingers.PRESETS.relaxed;
    assert('fingers: fist curls (L -Z / R +Z), spread ~0, presets resolve',
      fistOk && spreadOk && knownPreset,
      li ? `L.z=${li.z.toFixed(2)} R.z=${ri.z.toFixed(2)}` : 'no bone recorded');
  }

  // 8. springs follow-through — bounded, converges to the target, no NaN/blowup.
  {
    const spring = DANCE.springs.create();
    let bad = false;
    // Hold a constant chest target; the spring must settle near it, not explode.
    for (let i = 0; i < 2000; i++) {
      const pose = { hips: { px: 0 }, chest: { rz: 0.3, ry: 0 }, head: { rz: 0, ry: 0 }, spine: { rz: 0 } };
      spring.update(pose, 1 / 120);
      const v = pose.chest.rz;
      if (!isFinite(v) || Math.abs(v) > 5) { bad = true; break; }
    }
    // final settle check
    let last = 0;
    for (let i = 0; i < 3; i++) {
      const pose = { hips: { px: 0 }, chest: { rz: 0.3, ry: 0 }, head: { rz: 0, ry: 0 }, spine: { rz: 0 } };
      spring.update(pose, 1 / 120);
      last = pose.chest.rz;
    }
    assert('springs converge & stay bounded (no blowup)', !bad && Math.abs(last - 0.3) < 0.02,
      `settled chest.rz=${last.toFixed(4)}`);
  }

  // Render + console.
  const passN = results.filter((r) => r.ok).length;
  const pass = passN === results.length;
  document.getElementById('out').innerHTML =
    `<div class="sum ${pass ? 'ok' : 'fail'}">${pass ? 'PASS' : 'FAIL'} — ${passN}/${results.length} checks</div>` +
    results.map((r) =>
      `<div class="row ${r.ok ? 'ok' : 'fail'}"><b>${r.ok ? '\u2713' : '\u2717'}</b> ${r.name}` +
      `${r.detail ? ` <span>— ${r.detail}</span>` : ''}</div>`).join('');
  (pass ? console.log : console.error)('[rig-test]', `${passN}/${results.length}`, results);
})();

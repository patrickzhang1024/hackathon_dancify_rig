// Browser test runner for the THREE-free MotionScript v2 pipeline.
(function () {
  const results = [];
  const assert = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail || '' });
  const song = DANCE.constants.DEMO_SONG;
  const fixedBrief = DANCE.seeds.seedToBrief('motion-v2-fixed');
  const sample = DANCE.choreographer.compose(fixedBrief, song);

  const validation = DANCE.motionScript.validate(sample);
  assert('generated script satisfies MotionScript v2', validation.ok, validation.errors.join('; '));
  assert('rig contract exposes exactly 52 joints', DANCE.motionScript.JOINTS.length === 52,
    String(DANCE.motionScript.JOINTS.length));
  assert('every skeleton joint has an animation track',
    DANCE.motionScript.JOINTS.every((joint) => sample.tracks[joint]));

  const scheduledActions = DANCE.actionLibrary.GROUPS.map((group) => {
    const preset = DANCE.actionLibrary.list().find((entry) => entry.group === group);
    return { startBeat: 0, action: preset.name, group, frequency: 0.5, repetitions: 4, intensity: 1 };
  });
  const actionTracks = DANCE.actionLibrary.compile(scheduledActions, 8,
    Array.from({ length: 81 }, (_, index) => index / 10));
  assert('rig exposes presets for hands, legs, waist, neck, and arms',
    DANCE.actionLibrary.GROUPS.every((group) => DANCE.actionLibrary.list().some((entry) => entry.group === group)));
  assert('scheduled actions compile by frequency and repetition count',
    DANCE.actionLibrary.validate(scheduledActions, 8, true) === null &&
    DANCE.motionScript.validate({ version: 2, bpm: 120, totalBeats: 8, tracks: actionTracks }).ok);
  assert('all five action groups produce visible joint values',
    ['handL', 'upperLegL', 'hips', 'neck', 'upperArmL'].every((joint) =>
      actionTracks[joint].rotation.some((key) => key.value.some((value) => Math.abs(value) > 0.001))));

  // ---- section-based ActionScript v3: one routine per label, expanded by the rig ----
  const makeRoutine = (frequency) => ({
    description: 'demo routine',
    actions: DANCE.actionLibrary.GROUPS.map((group) => {
      const preset = DANCE.actionLibrary.list().find((entry) => entry.group === group);
      return { group, action: preset.name, frequency, intensity: 1 };
    })
  });
  const actionScriptV3 = {
    version: 3, bpm: 120, beatsPerBar: 4, totalBeats: 32,
    sections: [
      { label: 'intro', startBeat: 0, endBeat: 8, startS: 0, endS: 4 },
      { label: 'verse', startBeat: 8, endBeat: 20, startS: 4, endS: 10 },
      { label: 'verse', startBeat: 20, endBeat: 32, startS: 10, endS: 16 }
    ],
    routines: { intro: makeRoutine(0.5), verse: makeRoutine(1) }
  };
  const v3Validation = DANCE.actionLibrary.validateScript(actionScriptV3);
  assert('ActionScript v3 passes the compact-schema validator', v3Validation.ok, v3Validation.errors.join('; '));
  const compiledV3 = DANCE.actionLibrary.compileScript(actionScriptV3);
  assert('v3 compiles into a valid MotionScript v2 with section markers',
    DANCE.motionScript.validate(compiledV3).ok && compiledV3.version === 2 &&
    compiledV3.markers.length === 3 && compiledV3.tracks.hips.rotation.length > 0);
  const expandedV3 = DANCE.actionLibrary.expandToActions(actionScriptV3);
  const firstVerse = expandedV3.filter((a) => a.startBeat === 8).map((a) => a.action).sort().join(',');
  const secondVerse = expandedV3.filter((a) => a.startBeat === 20).map((a) => a.action).sort().join(',');
  assert('repeated sections reuse one routine and cover the song',
    firstVerse.length > 0 && firstVerse === secondVerse &&
    DANCE.actionLibrary.validate(expandedV3, 32, true) === null);

  const detailJoints = ['thumbDistalL', 'littleIntermediateR', 'toeBaseL', 'toeBaseR'];
  assert('finger and toe joints have independent keyframes',
    detailJoints.every((joint) => sample.tracks[joint].rotation.length > 2));

  const neutral = DANCE.motionScript.evaluate(sample, 0);
  assert('beat zero is a neutral non-intersecting stance',
    DANCE.motionScript.JOINTS.every((joint) =>
      ['rx', 'ry', 'rz'].every((axis) => neutral[joint][axis] === 0)) &&
      ['px', 'py', 'pz'].every((axis) => neutral.hips[axis] === 0));

  const duplicate = DANCE.choreographer.compose(DANCE.seeds.seedToBrief('motion-v2-fixed'), song);
  assert('generation is deterministic for a fixed seed', JSON.stringify(sample) === JSON.stringify(duplicate));

  const scripts = DANCE.seeds.randomStrings(20).map((seed) =>
    DANCE.choreographer.compose(DANCE.seeds.seedToBrief(seed), song));
  assert('20 random scripts are valid', scripts.every((script) => DANCE.motionScript.validate(script).ok));
  assert('random scripts are diverse', new Set(scripts.map((script) => JSON.stringify(script.tracks.hips))).size > 1);

  const interpolationScript = {
    version: 2,
    bpm: 120,
    totalBeats: 2,
    tracks: {
      hips: {
        rotation: [{ beat: 0, value: [0, 0, 0], easing: 'linear' }, { beat: 2, value: [0, 2, 0] }],
        position: [{ beat: 0, value: [0, 0, 0], easing: 'linear' }, { beat: 2, value: [2, 0, 0] }]
      },
      toeBaseR: { rotation: [{ beat: 0, value: [0, 0, 0] }, { beat: 2, value: [1, 0, 0] }] }
    }
  };
  const midpoint = DANCE.motionScript.evaluate(interpolationScript, 1);
  assert('rotation and root position interpolate at sub-beat time within anatomical limits',
    midpoint.hips.ry === 0.7 && midpoint.hips.px === 1 && midpoint.toeBaseR.rx === 0.5,
    JSON.stringify({ hips: midpoint.hips, toe: midpoint.toeBaseR }));

  const unsafeScript = JSON.parse(JSON.stringify(interpolationScript));
  unsafeScript.tracks.lowerLegL = { rotation: [{ beat: 0, value: [-2, 1, -1] }] };
  const bounded = DANCE.motionScript.evaluate(unsafeScript, 0).lowerLegL;
  assert('anatomical limits prevent knee hyperextension and lateral twisting',
    bounded.rx === -0.09 && bounded.ry === 0.12 && bounded.rz === -0.12,
    JSON.stringify(bounded));

  const handLimits = JSON.parse(JSON.stringify(interpolationScript));
  handLimits.tracks.indexIntermediateL = { rotation: [{ beat: 0, value: [-1, 1, -1] }] };
  handLimits.tracks.thumbDistalR = { rotation: [{ beat: 0, value: [-1, 1, -1] }] };
  const limitedHand = DANCE.motionScript.evaluate(handLimits, 0);
  assert('finger segments use hinge-specific anatomical limits',
    JSON.stringify(limitedHand.indexIntermediateL) === JSON.stringify({ rx: 0, ry: 0.08, rz: -0.08 }) &&
      JSON.stringify(limitedHand.thumbDistalR) === JSON.stringify({ rx: -0.05, ry: 0.12, rz: -0.12 }));

  const invalid = JSON.parse(JSON.stringify(interpolationScript));
  invalid.tracks.unknownBone = { rotation: [{ beat: 0, value: [0, 0, 0] }] };
  assert('unknown joints are rejected', !DANCE.motionScript.validate(invalid).ok);

  const passCount = results.filter((result) => result.ok).length;
  const pass = passCount === results.length;
  document.getElementById('out').innerHTML =
    `<div class="sum ${pass ? 'ok' : 'fail'}">${pass ? 'PASS' : 'FAIL'} — ${passCount}/${results.length} checks</div>` +
    results.map((result) =>
      `<div class="row ${result.ok ? 'ok' : 'fail'}"><b>${result.ok ? '\u2713' : '\u2717'}</b> ${result.name}` +
      `${result.detail ? ` <span>— ${result.detail}</span>` : ''}</div>`).join('');
  (pass ? console.log : console.error)('[motion-script-test]', `${passCount}/${results.length}`, results);
})();

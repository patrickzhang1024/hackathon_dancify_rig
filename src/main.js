// App bootstrap: build scene + rig, generate 5 seeds -> 5 scripts, wire UI.
// Called by the module loader once THREE + (optionally) the VRM are ready.
// `vrm` is the loaded @pixiv/three-vrm model, or null to fall back to the
// zero-asset primitive rig (e.g. when opened over file://).
DANCE.main = function main(vrm) {
  const canvas = document.getElementById('stage');
  const { scene, camera, renderer, resize } = DANCE.createScene(canvas);
  const rig = vrm ? DANCE.createRigVRM(vrm) : DANCE.createRig();
  scene.add(rig.root);

  const orbit = DANCE.attachOrbit(camera, renderer.domElement, new THREE.Vector3(0, 0.95, 0));

  const hud = {
    status: document.getElementById('status'),
    select: document.getElementById('scriptSelect'),
    brief: document.getElementById('brief'),
    beat: document.getElementById('beat'),
    section: document.getElementById('section'),
    move: document.getElementById('move'),
    state: document.getElementById('state'),
    dot: document.getElementById('beatDot')
  };

  const seq = DANCE.Sequencer(rig, (f) => {
    hud.beat.textContent = `${f.beat.toFixed(1)} / ${f.total}`;
    hud.section.textContent = f.section;
    hud.move.textContent = f.moveName;
    hud.state.textContent = f.bodyState;
    // pulse the beat dot on each beat
    const frac = f.beat - Math.floor(f.beat);
    hud.dot.style.transform = `scale(${1 + (1 - frac) * 0.8})`;
    hud.dot.style.opacity = String(0.35 + (1 - frac) * 0.65);
  });
  seq.setLoop(true);

  let scripts = [];

  function generate() {
    const song = DANCE.constants.DEMO_SONG;
    const seeds = DANCE.seeds.randomStrings(5);
    scripts = seeds.map((s) => DANCE.choreographer.compose(DANCE.seeds.seedToBrief(s), song));

    const check = DANCE.selfcheck(scripts);
    hud.status.textContent = check.pass
      ? `Self-check PASS — ${check.summary}`
      : `Self-check FAIL — ${check.summary}`;
    hud.status.className = check.pass ? 'ok' : 'fail';

    hud.select.innerHTML = '';
    scripts.forEach((s, i) => {
      const opt = document.createElement('option');
      const moves = s.timeline.reduce((n, sec) => n + sec.moves.length, 0);
      opt.value = String(i);
      opt.textContent = `#${i + 1} · ${s.brief.dance_genre} · ${s.brief.energy_bias} · ${moves} moves`;
      hud.select.appendChild(opt);
    });
    selectScript(0);
  }

  function selectScript(i) {
    const s = scripts[i];
    if (!s) return;
    seq.setScript(s);
    const b = s.brief;
    hud.brief.textContent =
      `seed ${b.seed} · genre ${b.dance_genre} · energy ${b.energy_bias} · ` +
      `spatial ${b.spatial_style} · complexity ${b.complexity} · ` +
      `stateBias ${b.body_state_bias} · ${s.bpm} BPM`;
  }

  // UI wiring
  hud.select.addEventListener('change', (e) => { seq.pause(); selectScript(Number(e.target.value)); setPlayLabel(); });
  document.getElementById('play').addEventListener('click', () => { seq.isPlaying() ? seq.pause() : seq.play(); setPlayLabel(); });
  document.getElementById('stop').addEventListener('click', () => { seq.stop(); setPlayLabel(); });
  document.getElementById('regen').addEventListener('click', () => { seq.stop(); generate(); setPlayLabel(); });
  document.getElementById('loop').addEventListener('change', (e) => seq.setLoop(e.target.checked));

  function setPlayLabel() {
    document.getElementById('play').textContent = seq.isPlaying() ? 'Pause' : 'Play';
  }

  // Render loop
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    seq.update(dt);
    rig.update(dt); // VRM spring bones (hair/cloth momentum) + normalized->raw
    orbit.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  generate();
  setPlayLabel();
  tick();
};

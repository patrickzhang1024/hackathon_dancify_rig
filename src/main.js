// App bootstrap: build scene + rig, generate 5 seeds -> 5 scripts, wire UI.
// Called after the vendored THREE module is ready.
DANCE.main = function main() {
  const canvas = document.getElementById('stage');
  const { scene, camera, renderer, resize } = DANCE.createScene(canvas);
  const rig = DANCE.createRig();
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
    hud.state.textContent = `${rig.height.toFixed(2)} m`;
    // pulse the beat dot on each beat
    const frac = f.beat - Math.floor(f.beat);
    hud.dot.style.transform = `scale(${1 + (1 - frac) * 0.8})`;
    hud.dot.style.opacity = String(0.35 + (1 - frac) * 0.65);
  });
  seq.setLoop(true);

  let scripts = [];
  const componentCategory = document.getElementById('componentCategory');
  const componentVariant = document.getElementById('componentVariant');
  const componentLabels = {
    base: 'Base mesh', head: 'Head', eye: 'Eyes', ear: 'Ears', nose: 'Nose',
    mouth: 'Mouth', teeth: 'Teeth', hand: 'Hands', feet: 'Feet'
  };

  for (const category in rig.components) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = componentLabels[category];
    componentCategory.appendChild(option);
  }

  function refreshComponentVariants() {
    const category = componentCategory.value;
    componentVariant.innerHTML = '';
    rig.components[category].forEach((label, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = label;
      option.selected = index === rig.componentSelection[category];
      componentVariant.appendChild(option);
    });
  }
  refreshComponentVariants();

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
      opt.value = String(i);
      opt.textContent = `#${i + 1} · ${s.brief.dance_genre} · ${Object.keys(s.tracks).length} joint tracks`;
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
  componentCategory.addEventListener('change', refreshComponentVariants);
  componentVariant.addEventListener('change', (event) => {
    rig.setComponent(componentCategory.value, Number(event.target.value));
    seq.update(0);
  });
  document.querySelectorAll('[data-profile]').forEach((button) => {
    button.addEventListener('click', (event) => {
      rig.setProfile(event.currentTarget.dataset.profile);
      document.querySelectorAll('[data-profile]').forEach((option) => {
        option.setAttribute('aria-pressed', String(option === event.currentTarget));
      });
      orbit.target.set(0, rig.height * 0.52, 0);
      hud.state.textContent = `${rig.height.toFixed(2)} m`;
      seq.update(0);
    });
  });

  function setPlayLabel() {
    document.getElementById('play').textContent = seq.isPlaying() ? 'Pause' : 'Play';
  }

  // Render loop
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    seq.update(dt);
    rig.update(dt);
    orbit.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  generate();
  orbit.target.set(0, rig.height * 0.52, 0);
  setPlayLabel();
  tick();
};

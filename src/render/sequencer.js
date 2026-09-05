// Beat-synced sequencer: plays a MotionControlScript on the rig.
// Virtual beat clock (no audio needed for the release test); crossfades between
// consecutive moves; transition clips carry body-state changes.
window.DANCE = window.DANCE || {};

DANCE.Sequencer = function Sequencer(rig, onFrame) {
  const idleClip = DANCE.moves.get('idle');
  let script = null;
  let flat = [];
  let beat = 0;
  let playing = false;
  let loop = true;
  let cursor = 0;

  function applyInstance(inst, atBeat) {
    const clip = DANCE.moves.get(inst.clipId);
    const local = atBeat - inst.startBeat;
    const t01 = Math.max(0, Math.min(1, local / inst.durationBeats));
    const pose = DANCE.moves.basePose();
    clip.apply(pose, {
      beat: atBeat, local, t01,
      intensity: inst.intensity, amp: inst.ampScale, mirror: inst.mirror
    });
    pose.hips.ry += (inst.facingDeg || 0) * Math.PI / 180;
    pose.hips.pz += (inst.travel || 0) * 0.3;
    pose.hands = inst.hands || clip.hands || 'relaxed';
    return pose;
  }

  function blend(a, b, w) {
    const out = DANCE.moves.basePose();
    for (const j of DANCE.moves.JOINTS) {
      for (const c of ['rx', 'ry', 'rz']) {
        out[j][c] = (a[j][c] || 0) * (1 - w) + (b[j][c] || 0) * w;
      }
    }
    for (const c of ['px', 'py', 'pz']) {
      out.hips[c] = (a.hips[c] || 0) * (1 - w) + (b.hips[c] || 0) * w;
    }
    // fingers don't blend numerically; switch to the incoming gesture past halfway
    out.hands = w >= 0.5 ? (b.hands || 'relaxed') : (a.hands || 'relaxed');
    return out;
  }

  function setScript(s) {
    script = s;
    flat = s.timeline.flatMap((sec) =>
      sec.moves.map((m) => Object.assign({ sectionLabel: sec.sectionLabel }, m,
        { endBeat: m.startBeat + m.durationBeats }))
    );
    beat = 0; cursor = 0; playing = false;
    rig.applyPose(applyInstance(flat[0] || idleInstance(), 0));
    emit();
  }

  function idleInstance() {
    return { clipId: 'idle', startBeat: 0, durationBeats: 4, intensity: 1, ampScale: 1, mirror: 0, facingDeg: 0, sectionLabel: '-' };
  }

  function activeIndex(atBeat) {
    // advance/rewind cursor to the instance covering atBeat
    if (!flat.length) return -1;
    while (cursor > 0 && atBeat < flat[cursor].startBeat) cursor--;
    while (cursor < flat.length - 1 && atBeat >= flat[cursor].endBeat) cursor++;
    return cursor;
  }

  function update(dt) {
    if (!script) return;
    if (playing) {
      beat += dt * (script.bpm / 60);
      if (beat >= script.totalBeats) {
        if (loop) { beat = beat % script.totalBeats; cursor = 0; }
        else { beat = script.totalBeats; playing = false; }
      }
    }

    const i = activeIndex(beat);
    const cur = i >= 0 ? flat[i] : idleInstance();
    let pose = applyInstance(cur, beat);

    // crossfade into the next move near the boundary
    const next = flat[i + 1];
    if (next) {
      const xf = Math.min(0.5, cur.durationBeats * 0.5);
      if (beat > cur.endBeat - xf) {
        const w = (beat - (cur.endBeat - xf)) / xf;
        pose = blend(pose, applyInstance(next, beat), Math.max(0, Math.min(1, w)));
      }
    }

    rig.applyPose(pose, dt);
    emit(cur);
  }

  function emit(cur) {
    if (!onFrame) return;
    const bpb = script ? script.beatsPerBar : 4;
    onFrame({
      beat,
      bar: Math.floor(beat / bpb),
      total: script ? script.totalBeats : 0,
      section: cur ? cur.sectionLabel : '-',
      moveName: cur ? (cur.name || cur.clipId) : '-',
      bodyState: cur ? (cur.bodyState || 'STAND') : 'STAND',
      playing
    });
  }

  return {
    setScript,
    play() { if (script) { if (beat >= script.totalBeats) { beat = 0; cursor = 0; } playing = true; } },
    pause() { playing = false; },
    stop() { playing = false; beat = 0; cursor = 0; if (script) rig.applyPose(applyInstance(flat[0] || idleInstance(), 0)); emit(); },
    setLoop(v) { loop = !!v; },
    update,
    isPlaying() { return playing; }
  };
};

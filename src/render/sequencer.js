// Beat clock for MotionScript v2 keyframe tracks.
window.DANCE = window.DANCE || {};

DANCE.Sequencer = function Sequencer(rig, onFrame) {
  let script = null;
  let beat = 0;
  let playing = false;
  let loop = true;

  function markerAt(atBeat) {
    if (!script || !script.markers) return '-';
    let label = '-';
    for (const marker of script.markers) {
      if (marker.beat > atBeat) break;
      label = marker.label;
    }
    return label;
  }

  function apply() {
    if (script) rig.applyPose(DANCE.motionScript.evaluate(script, beat));
  }

  function emit() {
    if (!onFrame) return;
    onFrame({ beat, total: script ? script.totalBeats : 0, section: markerAt(beat),
      moveName: 'keyframe tracks', bodyState: 'FULL BODY', playing });
  }

  function setScript(nextScript) {
    const result = DANCE.motionScript.validate(nextScript);
    if (!result.ok) throw new Error('Invalid MotionScript: ' + result.errors.join('; '));
    script = nextScript;
    beat = 0;
    playing = false;
    apply();
    emit();
  }

  function update(dt) {
    if (!script) return;
    if (playing) {
      beat += dt * script.bpm / 60;
      if (beat >= script.totalBeats) {
        if (loop) beat %= script.totalBeats;
        else { beat = script.totalBeats; playing = false; }
      }
    }
    apply();
    emit();
  }

  return {
    setScript,
    play() { if (script) { if (beat >= script.totalBeats) beat = 0; playing = true; } },
    pause() { playing = false; },
    stop() { playing = false; beat = 0; apply(); emit(); },
    setLoop(value) { loop = !!value; },
    update,
    isPlaying() { return playing; }
  };
};

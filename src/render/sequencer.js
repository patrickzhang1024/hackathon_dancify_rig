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

  function clearScript() {
    script = null;
    beat = 0;
    playing = false;
    rig.applyPose(DANCE.motionScript.basePose());
    emit();
  }

  function seekTime(seconds) {
    if (!script || !Number.isFinite(seconds)) return;
    const timeline = script.beatTimeline;
    if (Array.isArray(timeline) && timeline.length >= 2) {
      let time = Math.max(0, seconds);
      const endTime = timeline[timeline.length - 1].timeS;
      if (loop && endTime > 0) time %= endTime;
      if (time <= timeline[0].timeS) beat = timeline[0].beat;
      else {
        let next = 1;
        while (next < timeline.length && timeline[next].timeS <= time) next++;
        if (next >= timeline.length) beat = script.totalBeats;
        else {
          const previous = timeline[next - 1];
          const following = timeline[next];
          const span = following.timeS - previous.timeS;
          const fraction = span > 0 ? (time - previous.timeS) / span : 0;
          beat = previous.beat + (following.beat - previous.beat) * fraction;
        }
      }
    } else {
      beat = Math.max(0, seconds * script.bpm / 60);
    }
    if (loop) beat %= script.totalBeats;
    else beat = Math.min(beat, script.totalBeats);
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
    clearScript,
    seekTime,
    play() { if (script) { if (beat >= script.totalBeats) beat = 0; playing = true; } },
    pause() { playing = false; },
    stop() { playing = false; beat = 0; apply(); emit(); },
    setLoop(value) { loop = !!value; },
    update,
    isPlaying() { return playing; },
    hasScript() { return script !== null; },
    getBeat() { return beat; }
  };
};

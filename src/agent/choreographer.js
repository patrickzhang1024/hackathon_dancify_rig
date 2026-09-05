// Deterministic MotionScript v2 generator. Output is editable keyframe data;
// there are no named move clips or hidden procedural animation functions.
window.DANCE = window.DANCE || {};

DANCE.choreographer = (function () {
  const key = (beat, value, easing) => ({ beat, value, easing: easing || 'smooth' });
  const track = (keys) => ({ rotation: keys });
  const rounded = (value) => Math.round(value * 1000) / 1000;

  function compose(brief, song) {
    const rng = DANCE.seeds.mulberry32(brief.rngSeed >>> 0);
    const totalBeats = song.sections.reduce((sum, section) => sum + section.bars * song.beatsPerBar, 0);
    const amplitude = 0.75 + rng() * 0.35;
    const direction = rng() < 0.5 ? -1 : 1;
    const tracks = {};
    const markers = [];

    let sectionStart = 0;
    for (const section of song.sections) {
      markers.push({ beat: sectionStart, label: section.label });
      sectionStart += section.bars * song.beatsPerBar;
    }

    function wave(joint, axis, scale, offset, frequency) {
      const keys = [];
      for (let beat = 0; beat <= totalBeats; beat += 2) {
        const value = [0, 0, 0];
        value[axis] = rounded(Math.sin(beat * Math.PI * (frequency || 0.25) + (offset || 0)) * scale * amplitude);
        keys.push(key(beat, value));
      }
      tracks[joint] = track(keys);
    }

    function hinge(joint, scale, frequency) {
      const keys = [];
      for (let beat = 0; beat <= totalBeats; beat += 2) {
        const flexion = (1 - Math.cos(beat * Math.PI * (frequency || 0.25))) * 0.5;
        keys.push(key(beat, [rounded(flexion * scale * amplitude), 0, 0]));
      }
      tracks[joint] = track(keys);
    }

    wave('hips', 1, 0.24 * direction, 0, 0.25);
    tracks.hips.position = [];
    for (let beat = 0; beat <= totalBeats; beat += 1) {
      tracks.hips.position.push(key(beat, [
        rounded(Math.sin(beat * Math.PI * 0.25) * 0.1 * direction),
        rounded(-Math.abs(Math.sin(beat * Math.PI)) * 0.055 * amplitude),
        rounded(Math.sin(beat * Math.PI * 0.125) * 0.045)
      ]));
    }
    wave('spine', 2, 0.1, 0, 0.25);
    wave('chest', 1, 0.28 * direction, Math.PI, 0.25);
    wave('neck', 2, 0.06, Math.PI, 0.25);
    wave('head', 1, 0.14 * direction, 0, 0.25);

    for (const side of DANCE.motionScript.SIDES) {
      const sign = side === 'L' ? 1 : -1;
      wave('clavicle' + side, 2, 0.08 * sign, 0, 0.25);
      wave('upperArm' + side, 0, 1.25 * sign, 0, 0.25);
      hinge('lowerArm' + side, 0.9, 0.25);
      wave('hand' + side, 2, 0.35 * sign, 0, 0.5);
      wave('upperLeg' + side, 0, 0.55 * sign, 0, 0.25);
      hinge('lowerLeg' + side, 0.72, 0.25);
      wave('foot' + side, 0, 0.3 * sign, 0, 0.5);

      DANCE.motionScript.FINGERS.forEach((finger, index) => {
        const name = finger.toLowerCase();
        const curl = 0.25 + index * 0.08;
        wave(name + 'Proximal' + side, 0, curl, 0, 0.5);
        wave(name + 'Intermediate' + side, 0, curl * 1.25, 0, 0.5);
        wave(name + 'Distal' + side, 0, curl, 0, 0.5);
      });
      DANCE.motionScript.TOES.forEach((toe, index) => {
        wave('toe' + toe + side, 0, 0.16 + index * 0.02, 0, 0.5);
      });
    }

    return {
      version: 2, seed: brief.seed, brief, title: song.title,
      bpm: song.bpm, beatsPerBar: song.beatsPerBar, totalBeats, markers, tracks
    };
  }

  return { compose, validate: DANCE.motionScript.validate };
})();

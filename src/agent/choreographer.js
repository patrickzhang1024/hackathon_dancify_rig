// Deterministic local choreographer (Theme 3 release test).
// Turns a CreativeBrief + song structure into a MotionControlScript JSON, with a
// legal body-state machine (every state change bridged by a transition clip).
// ponytail: local deterministic composer stands in for the Theme 2 LLM call so
// the release test needs no API key; the output JSON schema is identical.
window.DANCE = window.DANCE || {};

DANCE.choreographer = (function () {
  // Finger gesture per move id (the VRM rig articulates fingers; the primitive
  // fallback ignores this). Default 'relaxed'.
  const HANDS = {
    idle: 'relaxed', bounce: 'relaxed', step_touch: 'relaxed',
    arm_pump: 'fist', clap: 'open', wave_hands: 'open',
    twist: 'relaxed', point_up: 'point', spin: 'open',
    sit_sway: 'relaxed', sit_clap: 'open',
    floor_pose: 'open', floor_wave: 'open', air_tuck: 'fist'
  };

  const pickWeighted = (rng, items, weightOf) => {
    let total = 0;
    for (const it of items) total += Math.max(0, weightOf(it));
    if (total <= 0) return items[Math.floor(rng() * items.length)];
    let r = rng() * total;
    for (const it of items) {
      r -= Math.max(0, weightOf(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  };

  function danceMovesFor(state, brief) {
    const all = DANCE.moves.list.filter(
      (m) => (m.type === 'dance' || m.type === 'idle') && m.bodyState === state
    );
    const matched = all.filter(
      (m) => m.genres.includes('all') || m.genres.includes(brief.dance_genre)
    );
    return matched.length ? matched : all;
  }

  const energyRank = { low: 0, medium: 1, high: 2 };
  const biasRank = { calm: 0, medium: 1, hype: 2 };

  function moveWeight(move, sectionEnergy, brief) {
    // Prefer moves whose energy matches the section + the brief's energy bias.
    const target = (energyRank[sectionEnergy] + biasRank[brief.energy_bias]) / 2;
    const d = Math.abs(energyRank[move.energy] - target);
    return 1 / (1 + d);
  }

  // Build a state "excursion" (STAND -> target -> STAND) that fits the budget.
  function buildExcursion(target, remaining, absBeat, brief, rng) {
    const C = DANCE.constants;
    const trIn = DANCE.moves.get(C.TRANSITIONS['STAND->' + target]);
    const trOut = DANCE.moves.get(C.TRANSITIONS[target + '->STAND']);
    if (!trIn || !trOut) return null;
    const danceOpts = danceMovesFor(target, brief);
    if (!danceOpts.length) return null;
    const dance = danceOpts[Math.floor(rng() * danceOpts.length)];
    const cost = trIn.beats + dance.beats + trOut.beats;
    if (cost > remaining) return null;

    const seq = [];
    let b = absBeat;
    for (const clip of [trIn, dance, trOut]) {
      seq.push(makeInstance(clip, b, clip.beats, brief, rng));
      b += clip.beats;
    }
    return seq;
  }

  function makeInstance(clip, startBeat, durationBeats, brief, rng) {
    const facing = brief.spatial_style === 'expansive' ? Math.round((rng() - 0.5) * 60) : 0;
    const travel = brief.spatial_style === 'traveling' ? Math.round((rng() - 0.5) * 100) / 100 : 0;
    return {
      clipId: clip.id,
      name: clip.name,
      startBeat,
      durationBeats,
      bodyState: clip.bodyState,
      intensity: Math.round((0.7 + rng() * 0.4) * 100) / 100,
      ampScale: Math.round((0.85 + rng() * 0.35) * 100) / 100,
      facingDeg: facing,
      mirror: rng() < 0.5 ? 1 : 0,
      travel,
      hands: HANDS[clip.id] || 'relaxed'
    };
  }

  function compose(brief, song) {
    const C = DANCE.constants;
    const rng = DANCE.seeds.mulberry32(brief.rngSeed >>> 0);
    const timeline = [];
    let absBeat = 0;

    // Excursion probability grows with body_state_bias; complexity shortens moves.
    const excursionP = 0.12 + brief.body_state_bias * 0.35;

    for (const section of song.sections) {
      const sectionBeats = section.bars * song.beatsPerBar;
      const sectionEnd = absBeat + sectionBeats;
      const moves = [];
      let state = 'STAND';

      while (absBeat < sectionEnd) {
        const remaining = sectionEnd - absBeat;

        // Try a state excursion only from STAND, and only if it fits with room
        // to also return before the section ends.
        if (state === 'STAND' && remaining >= 5 && rng() < excursionP) {
          const targets = ['SIT', 'FLOOR', 'AIR'];
          const target = targets[Math.floor(rng() * targets.length)];
          const seq = buildExcursion(target, remaining, absBeat, brief, rng);
          if (seq) {
            for (const inst of seq) moves.push(inst);
            absBeat = seq[seq.length - 1].startBeat + seq[seq.length - 1].durationBeats;
            continue;
          }
        }

        // Otherwise place a STAND dance move (tiled, clamped to section end).
        const opts = danceMovesFor('STAND', brief);
        const move = pickWeighted(rng, opts, (m) => moveWeight(m, section.energy, brief));
        const dur = Math.min(move.beats, remaining);
        if (dur < 1) break; // sub-beat remainder: leave (should not happen with even bars)
        moves.push(makeInstance(move, absBeat, dur, brief, rng));
        absBeat += dur;
      }

      timeline.push({
        sectionLabel: section.label,
        energy: section.energy,
        startBeat: sectionEnd - sectionBeats,
        endBeat: absBeat,
        moves
      });
    }

    return {
      seed: brief.seed,
      brief,
      title: song.title,
      bpm: song.bpm,
      beatsPerBar: song.beatsPerBar,
      beatGrid: 'quarter',
      totalBeats: absBeat,
      timeline
    };
  }

  // Validate: contiguity (no gaps/overlaps), clip existence, and a legal
  // body-state machine ending back at STAND.
  function validate(script) {
    const errors = [];
    let expected = 0;
    let state = 'STAND';
    const flat = script.timeline.flatMap((s) => s.moves);

    if (flat.length === 0) errors.push('empty timeline');

    for (const m of flat) {
      const clip = DANCE.moves.get(m.clipId);
      if (!clip) { errors.push(`unknown clip ${m.clipId}`); continue; }
      if (Math.abs(m.startBeat - expected) > 1e-6) {
        errors.push(`gap/overlap at beat ${m.startBeat} (expected ${expected})`);
      }
      if (clip.type === 'transition') {
        if (clip.fromState !== state) {
          errors.push(`illegal transition ${clip.id}: ${state}->${clip.toState}`);
        }
        state = clip.toState;
      } else if (clip.bodyState !== state) {
        errors.push(`move ${clip.id} needs state ${clip.bodyState} but body is ${state}`);
      }
      expected = m.startBeat + m.durationBeats;
    }

    if (Math.abs(expected - script.totalBeats) > 1e-6) {
      errors.push(`ends at ${expected}, expected total ${script.totalBeats}`);
    }
    if (state !== 'STAND') errors.push(`ends in state ${state}, expected STAND`);

    return { ok: errors.length === 0, errors };
  }

  return { compose, validate };
})();

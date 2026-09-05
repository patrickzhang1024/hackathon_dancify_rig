# Rig Playback Plan

## Scope

Maintain the standalone browser rig that consumes a validated `MotionControlScript` and
renders deterministic, beat-synchronized motion on a VRM humanoid. This repository owns the
character loader, procedural move library, state transitions, pose constraints, finger poses,
weight/follow-through dynamics, sequencing, rendering, build, and rig tests.

Audio analysis, lyrics interpretation, API keys, and LLM calls belong to the parent/music and
agent layers. The rig accepts data and never executes generated code.

## Reviewed Decisions

- Preserve the existing zero-build source app and PowerShell release build. A Vite migration
  is optional integration work, not a prerequisite for rig development.
- Use the existing open-source VRM path: three.js r140, `@pixiv/three-vrm`, and the bundled VRM
  character. Keep exact dependency and asset licenses documented before public release.
- Continue with deterministic procedural poses retargeted onto normalized VRM bones. This
  supersedes the feasibility document's earlier Mixamo/`AnimationMixer` clip-first assumption.
- Keep the primitive character fallback so model-load or WebGL asset failures do not make the
  demo unusable.
- Clamp anatomical limits every frame after pose composition. Finger poses, weight shift, and
  follow-through remain bounded layers; they may not bypass joint constraints.
- Do not claim foot planting until analytic leg IK exists and is visually tested. The current
  implementation has weight shift and follow-through but no `render/ik.js`.

## Input Contract

The rig consumes a versioned `MotionControlScript`:

```js
{
  schemaVersion: 1,
  bpm: 120,
  beatGrid: [0, 0.5, 1.0],
  timeline: [{
    sectionLabel: "chorus",
    startBeat: 0,
    endBeat: 16,
    moves: [{
      clipId: "move-id",
      startBeat: 0,
      durationBeats: 4,
      intensity: 0.8,
      facingDeg: 0,
      mirror: false,
      ampScale: 1,
      travel: [0, 0],
      transitionIn: null,
      hands: "relaxed"
    }]
  }]
}
```

Validation must reject unknown moves, non-finite values, timeline gaps/overlaps, invalid beat
ranges, unsupported hand poses, and illegal body-state transitions. Allowed states are
`STAND`, `SIT`, `FLOOR`, and `AIR`; state changes require registered transition moves, and
`AIR` must return to `STAND`.

## Runtime Order

Each animation frame uses a fixed order so later layers cannot invalidate earlier behavior:

1. Resolve the active move and beat-local progress.
2. Compose and crossfade procedural poses.
3. Apply mirror, amplitude, facing, and bounded travel parameters.
4. Apply the selected finger preset.
5. Apply center-of-mass weight shift and chest/head/spine follow-through.
6. Apply leg IK when that phase is implemented.
7. Clamp all controlled joints to anatomical limits.
8. Update VRM spring bones and render.

The sequencer uses the audio layer's monotonic playback position when integrated. The local
demo may retain its virtual clock, but both clocks must implement the same time-source API so
pause, seek, stop, loop, and late-frame recovery behave identically.

## Delivery Phases

### Phase 0: Baseline and compatibility lock

- Record exact three.js, three-vrm, GLTFLoader, VRM asset source, version, and license details.
- Run the current build, logic tests, VRM compatibility harness, and calibration page.
- Freeze the script schema and a known-good screenshot/pose set for regression comparison.

**Exit:** source and `dist/` load over HTTP with no console errors; the bundled model loads,
the primitive fallback can be forced, and all current deterministic tests pass.

### Phase 1: Contract hardening

- Centralize script validation at the rig boundary and return actionable validation errors.
- Verify exact move coverage, contiguous beats, body-state transitions, finite parameters,
  hand presets, and deterministic seed output.
- Keep the local choreographer only as a fixture generator; external scripts use the same
  validator and sequencer path.

**Exit:** valid local and external fixture scripts play; malformed and adversarial JSON is
rejected before it reaches rendering code.

### Phase 2: Motion quality

- Calibrate normalized VRM bone axes and joint limits for shoulders, elbows, wrists, hips,
  knees, ankles, spine, neck, and fingers.
- Expand poses only where they add missing body-state or transition coverage.
- Add two-bone analytic leg IK with ground targets, knee bend direction, reach limits, and
  smooth enable/disable blending. Apply it before the final clamp.
- Tune weight transfer and follow-through against slow, medium, and fast fixture scripts.

**Exit:** knees/elbows do not hyperextend; feet remain within the agreed positional tolerance
during planted intervals; finger poses are recognizable; no pose produces NaN transforms.

### Phase 3: Audio-clock integration

- Accept playback time and beat metadata from the parent app instead of maintaining an
  independent production clock.
- Implement seek, pause/resume, loop boundaries, dropped-frame recovery, and end-of-track.
- Test scripts generated from low-, medium-, and high-energy music reports.

**Exit:** move boundaries stay within 50 ms of the supplied beat grid during normal playback,
seeking reconstructs the correct pose without replaying the timeline, and pause/resume does
not drift.

### Phase 4: Release hardening

- Build `dist/`, verify all assets are copied, and serve it from a clean directory.
- Add graceful WebGL, model, and asset-load errors; keep fallback behavior explicit in the UI.
- Profile render cost and cap pixel ratio/spring work on low-end hardware when needed.

**Exit:** source and release builds pass automated tests and manual desktop/mobile viewport
checks; no remote runtime dependency, login, API key, or unlicensed asset is required.

## Verification Matrix

| Area | Automated check | Visual/browser check |
|---|---|---|
| Script contract | schema, finite values, move IDs, gaps/overlaps | validation message is usable |
| Determinism | same seed produces byte-equivalent script | same take follows same phrasing |
| State machine | all legal/illegal transition pairs | transitions do not snap or teleport |
| Joint safety | clamp boundaries and randomized pose fuzzing | no reverse elbows/knees |
| Fingers | every preset maps to valid finger channels | gestures read on both hands |
| Dynamics | spring stability over long runs | follow-through settles without jitter |
| Foot IK | reach/hinge/ground invariants | planted feet meet positional tolerance |
| Timing | simulated clock pause/seek/loop cases | audio-driven beat alignment |
| Build | `build.ps1` plus clean-server smoke test | VRM and fallback both render |

## Current Gaps and Deferred Work

- Foot IK is planned but not implemented; weight shift alone does not prevent sliding.
- Procedural motion is the MVP. Public-domain BVH retargeting may be evaluated later, but it
  must use a verified license and must not change the script contract.
- Full floor-contact physics, collision, and a general physics engine are deferred until the
  simpler IK and bounded spring model demonstrably fail acceptance criteria.
- The feasibility document's Mixamo recommendation is historical and should not be reintroduced
  without an explicit licensing, login, retargeting, and asset-consistency review.
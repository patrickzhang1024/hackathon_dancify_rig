# Rig Playback Plan

## Scope

Maintain the standalone browser rig that consumes a validated MotionScript and renders
deterministic, beat-synchronized motion on a Mixamo52 skeleton. This repository owns the
GLB loader, skeleton extraction, procedural move library, pose constraints, finger poses,
weight/follow-through dynamics, sequencing, rendering, build, and rig tests.

Audio analysis, lyrics interpretation, API keys, and LLM calls belong to the parent/music and
agent layers. The rig accepts data and never executes generated code.

## Reviewed Decisions

- Preserve the existing zero-build source app and PowerShell release build. A Vite migration
  is optional integration work, not a prerequisite for rig development.
- Use the existing open-source three.js path: three.js plus `GLTFLoader`, loading the Human
  Primitive Legacy GLB exports. Keep exact dependency and asset licenses (GPL-3.0 bodies)
  documented before public release.
- Standardize on **Mixamo52** (52 joints) as the rig, aligned exactly to `reference/skin-tokens`
  (canonical `mixamorig:*` names, single root, parent-before-child). `render/skeleton.js`
  asserts the emitted joint set equals Mixamo52 on load.
- Render the rig as a skeleton only: the skinned meshes are hidden and the viewport draws
  joint points and joint-to-joint bone segments. A skin bound to this rig is future work built
  from `reference/skin-tokens`.
- Continue with deterministic procedural poses driving the skeleton bones directly through
  MotionScript v2 beat-keyed channels. This supersedes the earlier `AnimationMixer` clip-first
  assumption.
- Clamp anatomical limits every frame after pose composition. Finger poses, weight shift, and
  follow-through remain bounded layers; they may not bypass joint constraints.
- Do not claim foot planting until analytic leg IK exists and is visually tested. The current
  implementation has weight shift and follow-through but no `render/ik.js`.

## Input Contract

The rig consumes a versioned MotionScript v2: independent beat-keyed channels per joint, with
no named-clip layer. The upstream AI agent emits this shape directly.

```js
{
  version: 2,
  bpm: 120,
  totalBeats: 8,
  markers: [{ beat: 0, label: "intro" }],
  tracks: {
    hips: {
      position: [{ beat: 0, value: [0, 0, 0], easing: "smooth" }],
      rotation: [{ beat: 0, value: [0, 0, 0], easing: "smooth" }]
    },
    indexDistalL: {
      rotation: [{ beat: 0.5, value: [0.8, 0, 0], easing: "hold" }]
    }
  }
}
```

Validation must reject a wrong `version`, non-positive `bpm`/`totalBeats`, a missing `tracks`
object, unknown joint names (only the 52 Mixamo52 joints are allowed), non-finite keyframe
values, and unsupported easing. Rotations are radians `[rx, ry, rz]`; `position` is valid only
on `hips`. Angles are clamped to per-joint anatomical limits every frame during evaluation.

## Runtime Order

Each animation frame uses a fixed order so later layers cannot invalidate earlier behavior:

1. Resolve the active move and beat-local progress.
2. Compose and crossfade procedural poses.
3. Apply mirror, amplitude, facing, and bounded travel parameters.
4. Apply the selected finger preset.
5. Apply center-of-mass weight shift and chest/head/spine follow-through.
6. Apply leg IK when that phase is implemented.
7. Clamp all controlled joints to anatomical limits.
8. Update the skeleton view (world-space joint points and bone segments) and render.

The sequencer uses the audio layer's monotonic playback position when integrated. The local
demo may retain its virtual clock, but both clocks must implement the same time-source API so
pause, seek, stop, loop, and late-frame recovery behave identically.

## Delivery Phases

### Phase 0: Baseline and compatibility lock

- Record exact three.js, `GLTFLoader`, GLB asset source, version, and license (GPL-3.0) details.
- Run the current build, logic tests, and the browser test page.
- Freeze the script schema, the 52-name Mixamo52 joint set, and a known-good skeleton screenshot
  for regression comparison.

**Exit:** source and `dist/` load over HTTP with no console errors; both GLB bodies load and map
to exactly 52 Mixamo52 joints, and all current deterministic tests pass.

### Phase 1: Contract hardening

- Centralize script validation at the rig boundary and return actionable validation errors.
- Verify version, positive bpm/totalBeats, known joint names, finite keyframe values, valid
  easing, monotonic beats per channel, and deterministic seed output.
- Keep the local choreographer only as a fixture generator; external scripts use the same
  validator and sequencer path.

**Exit:** valid local and external fixture scripts play; malformed and adversarial JSON is
rejected before it reaches rendering code.

### Phase 2: Motion quality

- Calibrate skeleton bone axes and joint limits for shoulders, elbows, wrists, hips,
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
- Profile render cost and cap pixel ratio on low-end hardware when needed.

**Exit:** source and release builds pass automated tests and manual desktop/mobile viewport
checks; no remote runtime dependency, login, API key, or unlicensed asset is required.

## Verification Matrix

| Area | Automated check | Visual/browser check |
|---|---|---|
| Script contract | schema, finite values, move IDs, gaps/overlaps | validation message is usable |
| Determinism | same seed produces byte-equivalent script | same take follows same phrasing |
| Interpolation | easing math and per-channel sampling | poses do not snap or teleport between keys |
| Joint safety | clamp boundaries and randomized pose fuzzing | no reverse elbows/knees |
| Fingers | every finger channel maps to a valid joint | gestures read on both hands |
| Dynamics | bounded weight/follow-through over long runs | follow-through settles without jitter |
| Foot IK | reach/hinge/ground invariants | planted feet meet positional tolerance |
| Timing | simulated clock pause/seek/loop cases | audio-driven beat alignment |
| Build | `build.ps1` plus clean-server smoke test | male and female skeletons both render |

## Current Gaps and Deferred Work

- Foot IK is planned but not implemented; weight shift alone does not prevent sliding.
- Skinning is not implemented yet. `reference/skin-tokens` will later generate a skin (皮套)
  bound to the Mixamo52 rig; until then the viewport is skeleton-only.
- Procedural motion is the MVP. Public-domain BVH retargeting may be evaluated later, but it
  must use a verified license and must not change the script contract.
- Full floor-contact physics, collision, and a general physics engine are deferred until the
  simpler IK and bounded weight model demonstrably fail acceptance criteria.
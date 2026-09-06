# Detailed Skeleton Choreographer

Offline three.js demo that renders Human Primitive Legacy skins driven by a validated **Mixamo52** skeleton (52 joints).

The skeleton is aligned exactly to `reference/skin-tokens`' Mixamo52 rig: 52 canonical `mixamorig:*` joints, a single root, and strict parent-before-child ordering. `src/render/skeleton.js` asserts this on load. MotionScript drives those 52 joints, and anatomical joint limits are clamped every frame.

The right panel switches between two requested profiles. `test_male` uses male body 4, hand 4, feet 5 at 1.78 m. `test_female` uses female body 4, hand 3, feet 6 at 1.65 m. Both share the same deform-bone mapping to the canonical Skin-Tokens Mixamo52 rig. These GPL-3.0 bodies are modeling primitives rather than optimized game-ready meshes.

The skinned meshes and the live joint-to-joint skeleton overlay are displayed together. The MotionScript spec is the control contract between the rig and the choreography layer.

Regenerate the browser assets with Blender 5.2:

```powershell
& 'D:\blender\blender.exe' --background --factory-startup --python .\tools\export_human_assets.py
```

## Run

Serve the repository over HTTP and open the source app:

```powershell
py -3 -m http.server 8765 --bind 127.0.0.1
```

- App: `http://127.0.0.1:8765/src/index.html`
- Tests: `http://127.0.0.1:8765/test/test.html`

Build the distributable version with:

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

Then serve `dist/` or open `http://127.0.0.1:8765/dist/index.html`.

## ActionScript choreography

The rig owns reusable action primitives in `src/render/actionLibrary.js`. Choreography schedules them with explicit timing:

```json
{
  "startBeat": 16,
  "action": "stepTouch",
  "group": "legs",
  "frequency": 0.5,
  "repetitions": 4,
  "intensity": 1.15
}
```

`frequency` is cycles per beat, so duration is `repetitions / frequency` beats. A complete agent phrase schedules one action for each group: `fullBody`, `hands`, `legs`, `waist`, `neck`, and `arms`. `fullBody` owns coordinated pathways such as turns, side-facing grooves, cross-steps, traveling steps, and body waves; the other groups layer detail over it. The action library validates full-song coverage and compiles the schedule into MotionScript v2.

## MotionScript v2

MotionScript remains the renderer contract and stores editable, beat-keyed channels directly:

```json
{
  "version": 2,
  "bpm": 120,
  "totalBeats": 8,
  "markers": [{ "beat": 0, "label": "intro" }],
  "tracks": {
    "hips": {
      "position": [
        { "beat": 0, "value": [0, 0, 0], "easing": "smooth" }
      ],
      "facing": [
        { "beat": 0, "value": [0], "easing": "smooth" }
      ],
      "rotation": [
        { "beat": 0, "value": [0, 0, 0], "easing": "smooth" }
      ]
    },
    "indexDistalL": {
      "rotation": [
        { "beat": 0, "value": [0, 0, 0], "easing": "linear" },
        { "beat": 0.5, "value": [0.8, 0, 0], "easing": "hold" }
      ]
    },
    "toeBaseR": {
      "rotation": [
        { "beat": 0, "value": [0.2, 0, 0] }
      ]
    }
  }
}
```

- Angles use radians as `[rx, ry, rz]`.
- Root translation uses scene units as `[px, py, pz]` and is valid only for `hips`.
- Keyframes support `smooth`, `linear`, and `hold` easing.
- Tracks may target any name in `DANCE.motionScript.JOINTS` — the 52 Mixamo52 joints: `hips`, `spine`, `spine1`, `spine2`, `neck`, `head`; per side `clavicle`/`upperArm`/`lowerArm`/`hand`, three-part fingers (e.g. `indexDistalL`), and `upperLeg`/`lowerLeg`/`foot`/`toeBase`.

## Source layout

- `src/render/motionScript.js`: schema, validation, joint names, interpolation
- `src/render/actionLibrary.js`: named body-part actions and ActionScript compiler
- `src/render/skeleton.js`: Mixamo52 rig extraction (skin-tokens `{names, parents}` form) and skeleton rendering
- `src/agent/choreographer.js`: deterministic detailed keyframe generation
- `src/render/character.js`: GLB loading, bone indexing, Mixamo52 bone mapping, and skeleton view wiring
- `tools/export_human_assets.py`: reproducible `.blend` to GLB export
- `src/render/sequencer.js`: beat clock and direct keyframe playback
- `test/run-tests.js`: schema, coverage, determinism, and interpolation checks

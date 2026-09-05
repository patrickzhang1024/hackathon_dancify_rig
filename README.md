# Detailed Skeleton Choreographer

Offline three.js demo that renders a **Mixamo52** skeleton (52 joints) driven by a validated MotionScript. The male and female bodies are exported from Human Primitive Legacy; their skinned meshes are hidden and only the joint-to-joint rig is drawn.

The skeleton is aligned exactly to `reference/skin-tokens`' Mixamo52 rig: 52 canonical `mixamorig:*` joints, a single root, and strict parent-before-child ordering. `src/render/skeleton.js` asserts this on load. MotionScript drives those 52 joints, and anatomical joint limits are clamped every frame.

The right panel switches between the authored male (1.76 m) and female (1.64 m) profiles. Both are locked to the source project's body-detail level 4 and share the same armature bone names, so each maps to the identical 52-joint rig at its own scale. These GPL-3.0 bodies are modeling primitives rather than optimized game-ready meshes.

Only the skeleton is drawn: joint points and joint-to-joint bone segments. The skinned meshes, skeleton helpers, support lines, ground geometry, and the grid are not displayed.

**Roadmap:** `reference/skin-tokens` will later generate a skin ("皮套") bound to this Mixamo52 rig. The MotionScript spec is the control contract between the rig and the choreography layer; the end goal is that motion scripts returned by an upstream AI agent play back as recognizable dance poses in this viewport.

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

## MotionScript v2

The previous named-clip action format has been removed. A script now stores editable, beat-keyed channels directly:

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
- `src/render/skeleton.js`: Mixamo52 rig extraction (skin-tokens `{names, parents}` form) and skeleton rendering
- `src/agent/choreographer.js`: deterministic detailed keyframe generation
- `src/render/character.js`: GLB loading, bone indexing, Mixamo52 bone mapping, and skeleton view wiring
- `tools/export_human_assets.py`: reproducible `.blend` to GLB export
- `src/render/sequencer.js`: beat clock and direct keyframe playback
- `test/run-tests.js`: schema, coverage, determinism, and interpolation checks

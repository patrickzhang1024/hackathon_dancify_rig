# Detailed Skeleton Choreographer

Offline three.js demo using the skinned male and female meshes from Human Primitive Legacy. The authored deform armature provides anatomical joint placement, including three joints per finger; MotionScript retains 59 compatible animation channels.

The right panel provides the authored male and female profiles with four body-detail levels. Every exported body contains its own fixed full deform armature; MotionScript rotates those bones and the skin follows through its authored weights.

The body control switches only the source project's Human (Male) and Human (Female) detail levels. Every body permanently includes Hand 5 and Feet 5: the hands retain their authored finger weights, while the feet use five independently weighted toe bones per side. Separate hand, feet, and face-part selectors are intentionally excluded. The source project notes that these GPL-3.0 assets are modeling primitives rather than optimized game-ready meshes.

Only the human is rendered in the viewport. The armature remains internal: skeleton helpers, support lines, ground geometry, and the grid are not displayed.

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
    "toeBigR": {
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
- Tracks may target any name in `DANCE.motionScript.JOINTS`.

## Source layout

- `src/render/motionScript.js`: schema, validation, joint names, interpolation
- `src/agent/choreographer.js`: deterministic detailed keyframe generation
- `src/render/character.js`: Human Primitive skin loading, bone mapping, and component fitting
- `tools/export_human_assets.py`: reproducible `.blend` to GLB export
- `src/render/sequencer.js`: beat clock and direct keyframe playback
- `test/run-tests.js`: schema, coverage, determinism, and interpolation checks

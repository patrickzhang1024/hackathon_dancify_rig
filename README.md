# Detailed Skeleton Choreographer

Offline three.js demo with a MediaPipe-inspired 59-landmark body made from volumetric connections and joint points. Both hands expose three joints per finger, and both feet expose five independently controlled toes.

The right panel provides two anthropometric profiles: male at 1.78 m and female at 1.65 m. Segment lengths, shoulder width, hip width, head size, and connector volume are rebuilt for each profile while keeping the same animation tracks.

The procedural skin also exposes the component catalog from [Human Primitive Legacy](https://github.com/BlenderBoi/Human_Primitive_Legacy): base, head, eyes, ears, nose, mouth, teeth, hands, and feet. The browser implementation reproduces those selectable categories and variation counts with lightweight procedural geometry; the upstream GPL-3.0 `.blend` meshes are not bundled or represented as game-ready assets.

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
- `src/render/character.js`: translucent body and full skeleton hierarchy
- `src/render/sequencer.js`: beat clock and direct keyframe playback
- `test/run-tests.js`: schema, coverage, determinism, and interpolation checks

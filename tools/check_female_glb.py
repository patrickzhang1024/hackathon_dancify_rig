"""Check a rigged GLB the way three.js will read it.

Parses the glTF JSON chunk, applies three.js PropertyBinding.sanitizeNodeName,
and asserts every joint src/render/character.js BONE_MAP needs is present and
actually bound in a skin. Run with plain python, no Blender needed:

    python tools/check_female_glb.py [path/to/model.glb]
"""
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "tools" / "_female_rigged.glb"

# three.js PropertyBinding: strip [ ] . : / and turn whitespace into _
RESERVED = re.compile(r"[\[\]\.:/]")


def sanitize(name):
    return RESERVED.sub("", re.sub(r"\s", "_", name))


def bone_map():
    """Mirror of BONE_MAP in src/render/character.js (52 driven joints)."""
    mapping = {
        "hips": "spine", "spine": "spine001", "spine1": "spine002",
        "spine2": "spine003", "neck": "spine005", "head": "spine006",
    }
    fingers = {"index": "f_index", "middle": "f_middle", "ring": "f_ring",
               "little": "f_pinky", "thumb": "thumb"}
    parts = {"Proximal": "01", "Intermediate": "02", "Distal": "03"}
    for side in ("L", "R"):
        mapping[f"clavicle{side}"] = f"shoulder{side}"
        mapping[f"upperArm{side}"] = f"upper_arm{side}"
        mapping[f"lowerArm{side}"] = f"forearm{side}"
        mapping[f"hand{side}"] = f"hand{side}"
        mapping[f"upperLeg{side}"] = f"thigh{side}"
        mapping[f"lowerLeg{side}"] = f"shin{side}"
        mapping[f"foot{side}"] = f"foot{side}"
        mapping[f"toeBase{side}"] = f"toe{side}"
        for finger, stem in fingers.items():
            for part, num in parts.items():
                key = finger + part + side
                mapping[key] = f"{stem}{num}{side}"
    return mapping


def read_gltf_json(path):
    raw = path.read_bytes()
    magic, version, _ = struct.unpack_from("<III", raw, 0)
    if magic != 0x46546C67:
        sys.exit(f"FAIL: {path} is not a GLB (bad magic)")
    if version != 2:
        sys.exit(f"FAIL: {path} is glTF version {version}, expected 2")
    length, kind = struct.unpack_from("<II", raw, 12)
    if kind != 0x4E4F534A:
        sys.exit(f"FAIL: {path} first chunk is not JSON")
    return json.loads(raw[20:20 + length])


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    if not path.is_file():
        sys.exit(f"FAIL: {path} not found")
    gltf = read_gltf_json(path)

    nodes = gltf.get("nodes", [])
    names = [sanitize(n.get("name", "")) for n in nodes]
    duplicates = {n for n in names if n and names.count(n) > 1}

    mapping = bone_map()
    if len(mapping) != 52:
        sys.exit(f"FAIL: bone map has {len(mapping)} entries, expected 52")

    available = set(names)
    missing = sorted(k for k, v in mapping.items() if v not in available)
    if missing:
        sys.exit(f"FAIL: {len(missing)} joints unreachable after sanitizing: {missing}")

    skins = gltf.get("skins", [])
    if not skins:
        sys.exit("FAIL: no skins in GLB, meshes would not follow the armature")
    skinned = {names[i] for skin in skins for i in skin.get("joints", [])}
    unbound = sorted(k for k, v in mapping.items() if v not in skinned)
    if unbound:
        sys.exit(f"FAIL: {len(unbound)} joints exist but are not skin joints: {unbound}")

    hit = {v for v in mapping.values()}
    clash = duplicates & hit
    if clash:
        sys.exit(f"FAIL: duplicate node names collide with driven joints: {sorted(clash)}")

    images = gltf.get("images", [])
    untextured = [m.get("name", "?") for m in gltf.get("materials", [])
                  if "baseColorTexture" not in m.get("pbrMetallicRoughness", {})]
    if not images:
        sys.exit("FAIL: no images in GLB, the character would render untextured")
    if untextured:
        sys.exit(f"FAIL: materials without a base colour texture: {untextured}")

    meshed = sum(1 for n in nodes if "mesh" in n)
    print(f"OK: {path.name} - {len(nodes)} nodes, {len(skins)} skin(s), "
          f"{len(skinned)} skin joints, {meshed} mesh nodes, "
          f"{len(gltf.get('materials', []))} materials, {len(images)} images")
    print("OK: all 52 BONE_MAP joints resolve after three.js name sanitizing "
          "and are bound in a skin")


main()

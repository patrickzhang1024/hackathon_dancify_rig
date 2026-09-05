"""Headless introspection of the Human Primitive source .blend files.

Run: & 'D:\\blender\\blender.exe' --background --factory-startup --python .\\tools\\_introspect_blend.py
Prints bone placement and mesh bounds needed to fix hand/feet grafting.
"""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "reference" / "Human_Primitive_Legacy" / "Assets"


def dump_bounds(name, verts):
    xs = [v[0] for v in verts]
    ys = [v[1] for v in verts]
    zs = [v[2] for v in verts]
    print(f"  {name}: n={len(verts)} "
          f"x[{min(xs):.4f},{max(xs):.4f}] "
          f"y[{min(ys):.4f},{max(ys):.4f}] "
          f"z[{min(zs):.4f},{max(zs):.4f}] "
          f"size=({max(xs)-min(xs):.4f},{max(ys)-min(ys):.4f},{max(zs)-min(zs):.4f})")


def dump_armature(arm, bones_of_interest):
    print(f"  Armature '{arm.name}': {len(arm.data.bones)} bones")
    for bn in bones_of_interest:
        b = arm.data.bones.get(bn)
        if not b:
            print(f"    [missing] {bn}")
            continue
        h, t = b.head_local, b.tail_local
        print(f"    {bn}: head=({h.x:.4f},{h.y:.4f},{h.z:.4f}) "
              f"tail=({t.x:.4f},{t.y:.4f},{t.z:.4f}) len={b.length:.4f} "
              f"parent={b.parent.name if b.parent else None}")


def open_and_report(blend, label):
    print("=" * 70)
    print(f"{label}: {blend.name}")
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    print("  Objects:")
    for obj in bpy.data.objects:
        print(f"    - {obj.name} ({obj.type})")
    print("  Armatures + interesting bones:")
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            names = [b.name for b in obj.data.bones]
            interest = [n for n in names if any(k in n.lower()
                        for k in ("hand", "forearm", "foot", "toe", "shin", "thigh", "spine"))]
            dump_armature(obj, interest)
    print("  Mesh bounds:")
    for obj in bpy.data.objects:
        if obj.type == "MESH" and obj.data.vertices:
            dump_bounds(obj.name, [v.co for v in obj.data.vertices])


for fn, label in (
    ("Male_Human.blend", "MALE BODY"),
    ("Female_Human.blend", "FEMALE BODY"),
    ("Hand.blend", "HAND"),
    ("Feet.blend", "FEET"),
):
    open_and_report(ASSETS / fn, label)
print("=" * 70)
print("DONE")

"""Dump the armature shipped in assets/models/female-4.glb (rest pose + extents).

Run: & 'D:\\blender\\blender.exe' --background --factory-startup --python .\\tools\\_introspect_rig.py
"""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "assets" / "models" / "female-4.glb"))

for obj in bpy.data.objects:
    if obj.type != "ARMATURE":
        continue
    bones = obj.data.bones
    zs = [b.head_local.z for b in bones] + [b.tail_local.z for b in bones]
    print(f"ARMATURE '{obj.name}' bones={len(bones)} z[{min(zs):.4f},{max(zs):.4f}]"
          f" matrix_world_scale={tuple(round(v, 4) for v in obj.matrix_world.to_scale())}")
    for b in bones:
        h, t = b.head_local, b.tail_local
        print(f"  {b.name} parent={b.parent.name if b.parent else None} "
              f"head=({h.x:.4f},{h.y:.4f},{h.z:.4f}) tail=({t.x:.4f},{t.y:.4f},{t.z:.4f}) "
              f"deform={b.use_deform}")

for obj in bpy.data.objects:
    if obj.type != "MESH" or not obj.data.vertices:
        continue
    co = [obj.matrix_world @ v.co for v in obj.data.vertices]
    print(f"MESH {obj.name} verts={len(co)} "
          f"x[{min(c.x for c in co):.4f},{max(c.x for c in co):.4f}] "
          f"z[{min(c.z for c in co):.4f},{max(c.z for c in co):.4f}]")

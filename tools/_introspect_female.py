"""Report objects, armatures and mesh bounds in reference/female.blend.

Run: & 'D:\\blender\\blender.exe' --background --factory-startup reference\\female.blend --python .\\tools\\_introspect_female.py
"""
import bpy

print("=" * 70)
print("OBJECTS")
for obj in bpy.data.objects:
    print(f"  - {obj.name} ({obj.type}) parent={obj.parent.name if obj.parent else None}")
    for mod in obj.modifiers:
        print(f"      modifier: {mod.type} -> {getattr(mod, 'object', None)}")

print("ARMATURES")
for obj in bpy.data.objects:
    if obj.type != "ARMATURE":
        continue
    bones = obj.data.bones
    print(f"  '{obj.name}': {len(bones)} bones")
    for b in bones:
        h = b.head_local
        print(f"    {b.name} parent={b.parent.name if b.parent else None} "
              f"head=({h.x:.4f},{h.y:.4f},{h.z:.4f}) len={b.length:.4f}")

print("MESHES")
for obj in bpy.data.objects:
    if obj.type != "MESH" or not obj.data.vertices:
        continue
    co = [obj.matrix_world @ v.co for v in obj.data.vertices]
    xs = [c.x for c in co]
    ys = [c.y for c in co]
    zs = [c.z for c in co]
    print(f"  {obj.name}: verts={len(co)} tris={len(obj.data.polygons)} "
          f"x[{min(xs):.4f},{max(xs):.4f}] y[{min(ys):.4f},{max(ys):.4f}] z[{min(zs):.4f},{max(zs):.4f}]")
    print(f"      vertex_groups={len(obj.vertex_groups)} shape_keys="
          f"{len(obj.data.shape_keys.key_blocks) if obj.data.shape_keys else 0} "
          f"materials={[m.name for m in obj.data.materials if m]}")

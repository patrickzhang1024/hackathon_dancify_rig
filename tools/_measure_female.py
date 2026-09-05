"""Measure reference/female.blend so the Rigify armature can be fitted to it.

Run: & 'D:\\blender\\blender.exe' --background --factory-startup reference\\female.blend --python .\\tools\\_measure_female.py
"""
import bpy

BODY = "Object_10"   # torso + arms + legs
HEAD = "Object_11"   # head


def world_verts(name):
    obj = bpy.data.objects[name]
    return [obj.matrix_world @ v.co for v in obj.data.vertices]


body = world_verts(BODY)
head = world_verts(HEAD)

print("=" * 70)
print(f"HEAD crown z={max(c.z for c in head):.4f}  base z={min(c.z for c in head):.4f}")
print(f"BODY z[{min(c.z for c in body):.4f},{max(c.z for c in body):.4f}] "
      f"x[{min(c.x for c in body):.4f},{max(c.x for c in body):.4f}]")

print("\nARM PROFILE (verts with x>0.16, bucketed by x)")
print("  x_lo   n     z[min,max]        z_ctr    y_ctr")
x = 0.16
while x < 0.76:
    sl = [c for c in body if x <= c.x < x + 0.04]
    if sl:
        zs = [c.z for c in sl]
        ys = [c.y for c in sl]
        print(f"  {x:.2f}  {len(sl):5d}  [{min(zs):.4f},{max(zs):.4f}]  "
              f"{(min(zs)+max(zs))/2:.4f}  {(min(ys)+max(ys))/2:.4f}")
    x += 0.04

print("\nZ PROFILE (left half, x>0.02, bucketed by z)")
print("  z_lo   n     x[min,max]        y[min,max]")
z = 0.0
while z < 1.46:
    sl = [c for c in body if z <= c.z < z + 0.05 and c.x > 0.02]
    if sl:
        xs = [c.x for c in sl]
        ys = [c.y for c in sl]
        print(f"  {z:.2f}  {len(sl):5d}  [{min(xs):.4f},{max(xs):.4f}]  "
              f"[{min(ys):.4f},{max(ys):.4f}]")
    z += 0.05

print("\nCROTCH SCAN (max z where the two legs are still separate, x>0.02 only)")
z = 0.60
crotch = None
while z < 1.00:
    sl = [c for c in body if z <= c.z < z + 0.02 and abs(c.y) < 0.06]
    inner = [c.x for c in sl if 0.0 < c.x < 0.10]
    if inner and min(inner) > 0.012:
        crotch = z
    z += 0.02
print(f"  crotch ~ z={crotch}")

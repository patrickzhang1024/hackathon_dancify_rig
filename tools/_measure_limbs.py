"""Locate limb joints in reference/female.blend for armature fitting.

Run: & 'D:\\blender\\blender.exe' --background --factory-startup reference\\female.blend --python .\\tools\\_measure_limbs.py
"""
import bpy

BODY = "Object_10"


def wv(name):
    o = bpy.data.objects[name]
    return [o.matrix_world @ v.co for v in o.data.vertices]


body = wv(BODY)


def slices(verts, key, lo, hi, step, pick):
    """Yield (band_lo, centroid_of_pick_axes, extent_of_pick_axes, n)."""
    t = lo
    while t < hi:
        sl = [c for c in verts if t <= key(c) < t + step]
        if sl:
            a = [pick(c)[0] for c in sl]
            b = [pick(c)[1] for c in sl]
            yield (t, sum(a) / len(a), sum(b) / len(b),
                   max(a) - min(a), max(b) - min(b), len(sl))
        t += step


print("=" * 72)
print("LEG (left, x>0.02, z<0.70)   z_lo   x_ctr   y_ctr   x_ext  y_ext   n")
leg = [c for c in body if c.x > 0.02 and c.z < 0.70]
for z, xc, yc, xe, ye, n in slices(leg, lambda c: c.z, 0.02, 0.70, 0.03,
                                   lambda c: (c.x, c.y)):
    print(f"                             {z:.2f}  {xc:.4f}  {yc:+.4f}  "
          f"{xe:.4f} {ye:.4f}  {n:4d}")

print()
print("ARM (left, x>0.19, z>1.20)    x_lo   y_ctr   z_ctr   y_ext  z_ext   n")
arm = [c for c in body if c.x > 0.19 and c.z > 1.20]
for x, yc, zc, ye, ze, n in slices(arm, lambda c: c.x, 0.19, 0.75, 0.025,
                                   lambda c: (c.y, c.z)):
    print(f"                              {x:.3f}  {yc:+.4f}  {zc:.4f}  "
          f"{ye:.4f} {ze:.4f}  {n:4d}")

print()
print("TORSO CENTRELINE (|x|<0.02)  z_lo   y_ctr   y_ext   n")
mid = [c for c in body if abs(c.x) < 0.02]
for z, yc, _zc, ye, _ze, n in slices(mid, lambda c: c.z, 0.66, 1.46, 0.04,
                                     lambda c: (c.y, c.z)):
    print(f"                             {z:.2f}  {yc:+.4f}  {ye:.4f}  {n:4d}")

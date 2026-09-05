"""Resolve facing direction + foot/knee anchors in reference/female.blend.

Run: & 'D:\\blender\\blender.exe' --background --factory-startup reference\\female.blend --python .\\tools\\_measure_facing.py
"""
import bpy

PARTS = {"body": "Object_10", "head": "Object_11", "sneakers": "Object_13"}


def wv(name):
    o = bpy.data.objects[name]
    return [o.matrix_world @ v.co for v in o.data.vertices]


print("=" * 72)
for label, name in PARTS.items():
    v = wv(name)
    print(f"{label:9s} x[{min(c.x for c in v):+.4f},{max(c.x for c in v):+.4f}] "
          f"y[{min(c.y for c in v):+.4f},{max(c.y for c in v):+.4f}] "
          f"z[{min(c.z for c in v):+.4f},{max(c.z for c in v):+.4f}]")

print()
print("SNEAKER (left, x>0.02) z_lo  y[min,max]  y_ctr   x_ctr   n")
sn = [c for c in wv(PARTS["sneakers"]) if c.x > 0.02]
z = -0.01
while z < 0.15:
    sl = [c for c in sn if z <= c.z < z + 0.02]
    if sl:
        ys = [c.y for c in sl]
        print(f"                       {z:+.2f}  [{min(ys):+.4f},{max(ys):+.4f}]  "
              f"{sum(ys)/len(ys):+.4f}  {sum(c.x for c in sl)/len(sl):.4f}  {len(sl):4d}")
    z += 0.02

print()
print("HEAD y-profile (|x|<0.015)  z_lo  y[min,max]   n")
hd = [c for c in wv(PARTS["head"]) if abs(c.x) < 0.015]
z = 1.43
while z < 1.71:
    sl = [c for c in hd if z <= c.z < z + 0.03]
    if sl:
        ys = [c.y for c in sl]
        print(f"                            {z:.2f}  [{min(ys):+.4f},{max(ys):+.4f}]  {len(sl):4d}")
    z += 0.03

print()
print("KNEE SCAN (left leg, y extent per z band -> kneecap bulge)")
leg = [c for c in wv(PARTS["body"]) if 0.02 < c.x < 0.18 and c.z < 0.70]
z = 0.30
while z < 0.62:
    sl = [c for c in leg if z <= c.z < z + 0.02]
    if sl:
        ys = [c.y for c in sl]
        print(f"  z={z:.2f}  y_max={max(ys):+.4f}  y_min={min(ys):+.4f}  n={len(sl):4d}")
    z += 0.02

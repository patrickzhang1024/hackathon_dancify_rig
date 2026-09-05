"""Rig reference/female.blend: build a Rigify-named armature fitted to the
measured T-pose anatomy, heat-map weight every mesh, export GLB.

Anchors below come from tools/_measure_female.py / _measure_limbs.py /
_measure_facing.py against the actual mesh. Character faces -Y, Z up.

Run:
  & 'D:\\blender\\blender.exe' --background --factory-startup ^
      reference\\female.blend --python .\\tools\\rig_female.py
"""
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools" / "_female_rigged.glb"

# Bone Heat only solves on closed volumes, so the body and head get auto weights
# and the garment shells inherit them by nearest-surface transfer.
SKIN = ("Object_10", "Object_11")
GARMENTS = ("Object_8", "Object_4", "Object_6", "Object_13")
MESHES = SKIN + GARMENTS

# --- measured anchors (left side; right side is mirrored on x) ---------------
S = {  # spine chain joints, low -> high
    0: (0.000, +0.010, 0.800),   # pelvis / base of spine (crotch 0.68, hip max 0.80)
    1: (0.000, +0.000, 0.900),
    2: (0.000, -0.010, 1.030),   # waist narrowest z=1.05
    3: (0.000, -0.020, 1.160),
    4: (0.000, -0.025, 1.310),   # chest top, shoulder level
    5: (0.000, -0.015, 1.385),
    6: (0.000, -0.005, 1.450),   # head base (mesh 1.432)
    7: (0.000, +0.000, 1.680),   # crown (mesh 1.7018)
}
SHOULDER = (0.025, +0.035, 1.320)
ARM = (0.160, +0.055, 1.335)     # arm axis measured horizontal at z~1.328
ELBOW = (0.365, +0.062, 1.327)
WRIST = (0.565, +0.060, 1.325)   # hand widens here
KNUCKLE = (0.633, +0.058, 1.324)
HIP = (0.085, +0.005, 0.780)
KNEE = (0.072, -0.005, 0.460)    # leg x-extent local min
ANKLE = (0.066, +0.030, 0.135)   # leg narrowest
BALL = (0.066, -0.055, 0.035)
TOE = (0.066, -0.120, 0.028)     # sneaker toe box

# finger name -> y offset across the palm (index nearest the -Y front)
FINGER_Y = {"f_index": 0.022, "f_middle": 0.047, "f_ring": 0.070, "f_pinky": 0.092}
FINGER_X = (0.633, 0.673, 0.706, 0.735)
THUMB = ((0.585, +0.030, 1.315), (0.625, +0.005, 1.308),
         (0.658, -0.010, 1.304), (0.685, -0.022, 1.301))


def build_bone_table():
    """[(name, parent, head, tail)] in parent-before-child order."""
    bones = [("spine", None, S[0], S[1])]
    for i in range(1, 7):
        bones.append((f"spine.{i:03d}", "spine" if i == 1 else f"spine.{i - 1:03d}",
                      S[i], S[i + 1]))

    for side, sx in (("L", 1.0), ("R", -1.0)):
        def m(p):
            return (p[0] * sx, p[1], p[2])

        bones += [
            (f"shoulder.{side}", "spine.003", m(SHOULDER), m(ARM)),
            (f"upper_arm.{side}", f"shoulder.{side}", m(ARM), m(ELBOW)),
            (f"forearm.{side}", f"upper_arm.{side}", m(ELBOW), m(WRIST)),
            (f"hand.{side}", f"forearm.{side}", m(WRIST), m(KNUCKLE)),
        ]
        for finger, fy in FINGER_Y.items():
            for seg in range(3):
                parent = f"hand.{side}" if seg == 0 else f"{finger}.{seg:02d}.{side}"
                bones.append((
                    f"{finger}.{seg + 1:02d}.{side}", parent,
                    m((FINGER_X[seg], fy, KNUCKLE[2])),
                    m((FINGER_X[seg + 1], fy, KNUCKLE[2])),
                ))
        for seg in range(3):
            parent = f"hand.{side}" if seg == 0 else f"thumb.{seg:02d}.{side}"
            bones.append((f"thumb.{seg + 1:02d}.{side}", parent,
                          m(THUMB[seg]), m(THUMB[seg + 1])))
        bones += [
            (f"thigh.{side}", "spine", m(HIP), m(KNEE)),
            (f"shin.{side}", f"thigh.{side}", m(KNEE), m(ANKLE)),
            (f"foot.{side}", f"shin.{side}", m(ANKLE), m(BALL)),
            (f"toe.{side}", f"foot.{side}", m(BALL), m(TOE)),
        ]
    return bones


# the 52 joints src/render/character.js BONE_MAP resolves, after three.js
# strips dots from glTF node names
def expected_dotless():
    names = {"spine", "spine001", "spine002", "spine003", "spine005", "spine006"}
    for side in ("L", "R"):
        names |= {f"shoulder{side}", f"upper_arm{side}", f"forearm{side}",
                  f"hand{side}", f"thigh{side}", f"shin{side}", f"foot{side}",
                  f"toe{side}"}
        for finger in list(FINGER_Y) + ["thumb"]:
            names |= {f"{finger}0{seg}{side}" for seg in (1, 2, 3)}
    return names


def flatten_meshes():
    """Detach meshes from the Sketchfab empty hierarchy, baking world transforms."""
    objs = []
    for name in MESHES:
        obj = bpy.data.objects.get(name)
        if obj is None:
            sys.exit(f"FAIL: mesh {name} missing from female.blend")
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world
        objs.append(obj)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # empties left behind would export as stray nodes
    for obj in [o for o in bpy.data.objects if o.type == "EMPTY"]:
        bpy.data.objects.remove(obj, do_unlink=True)
    return objs


def create_armature(table):
    arm_data = bpy.data.armatures.new("Female_Deform")
    arm_obj = bpy.data.objects.new("Female_Deform", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")

    for name, parent, head, tail in table:
        bone = arm_data.edit_bones.new(name)
        bone.head = Vector(head)
        bone.tail = Vector(tail)
        bone.use_deform = True
        if parent:
            bone.parent = arm_data.edit_bones[parent]
            bone.use_connect = False  # heads are measured, never snapped
        if (bone.tail - bone.head).length < 1e-4:
            sys.exit(f"FAIL: zero-length bone {name}")

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


def transfer_garment_weights():
    """Project skin weights onto the open garment shells by nearest surface."""
    hair = {"Object_8"}
    for name in GARMENTS:
        obj = bpy.data.objects[name]
        source = bpy.data.objects["Object_11" if name in hair else "Object_10"]
        # forward transfer: active object is the source, garment is selected.
        # use_reverse_transfer swaps the layers_select_* enum semantics, so avoid it.
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        source.select_set(True)
        bpy.context.view_layer.objects.active = source
        bpy.ops.object.data_transfer(
            data_type="VGROUP_WEIGHTS",
            vert_mapping="POLYINTERP_NEAREST",
            layers_select_src="ALL",
            layers_select_dst="NAME",
        )
        gaps = sum(1 for v in obj.data.vertices if not v.groups)
        print(f"  {name}: {gaps} unweighted after transfer")


def fill_unweighted(obj, arm_obj):
    """Pin leftover verts to their nearest bone; unweighted verts collapse to the
    origin in a skinned glTF."""
    strays = [v for v in obj.data.vertices if not v.groups]
    if not strays:
        return 0
    segments = [(b.name, b.head_local, b.tail_local) for b in arm_obj.data.bones]
    for vert in strays:
        best = min(
            segments,
            key=lambda s: (vert.co - clamped_point_on_segment(vert.co, s[1], s[2])).length,
        )
        group = obj.vertex_groups.get(best[0]) or obj.vertex_groups.new(name=best[0])
        group.add([vert.index], 1.0, "REPLACE")
    return len(strays)


def clamped_point_on_segment(point, head, tail):
    span = tail - head
    length_sq = span.length_squared
    if length_sq < 1e-12:
        return head
    factor = max(0.0, min(1.0, (point - head).dot(span) / length_sq))
    return head + span * factor


def verify(arm_obj):
    """The runnable check: names, single root, parent-before-child, in-mesh."""
    bones = list(arm_obj.data.bones)
    dotless = {b.name.replace(".", ""): b for b in bones}
    missing = sorted(expected_dotless() - set(dotless))
    if missing:
        sys.exit(f"FAIL: {len(missing)} joints unreachable by BONE_MAP: {missing}")

    roots = [b.name for b in bones if b.parent is None]
    if roots != ["spine"]:
        sys.exit(f"FAIL: expected exactly one root 'spine', got {roots}")

    order = {b.name: i for i, b in enumerate(bones)}
    for b in bones:
        if b.parent and order[b.parent.name] >= order[b.name]:
            sys.exit(f"FAIL: {b.name} precedes its parent {b.parent.name}")

    body = bpy.data.objects["Object_10"]
    lo = Vector((min(v.co.x for v in body.data.vertices),
                 min(v.co.y for v in body.data.vertices),
                 min(v.co.z for v in body.data.vertices)))
    hi = Vector((max(v.co.x for v in body.data.vertices),
                 max(v.co.y for v in body.data.vertices),
                 max(v.co.z for v in body.data.vertices)))
    for b in bones:
        for label, p in (("head", b.head_local), ("tail", b.tail_local)):
            if not all(lo[i] - 0.06 <= p[i] <= hi[i] + 0.26 for i in range(3)):
                sys.exit(f"FAIL: {b.name} {label} {tuple(round(c, 3) for c in p)} "
                         f"outside mesh bounds")

    print(f"OK: {len(bones)} bones, 52/52 BONE_MAP joints resolve, single root, "
          f"parents ordered, all joints inside mesh bounds")


def main():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    meshes = flatten_meshes()
    arm_obj = create_armature(build_bone_table())
    verify(arm_obj)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    transfer_garment_weights()

    for obj in meshes:
        filled = fill_unweighted(obj, arm_obj)
        if filled:
            print(f"  {obj.name}: pinned {filled} leftover verts to nearest bone")

    stray = {obj.name: sum(1 for v in obj.data.vertices if not v.groups)
             for obj in meshes}
    stray = {k: v for k, v in stray.items() if v}
    if stray:
        sys.exit(f"FAIL: unweighted verts remain: {stray}")
    print(f"OK: all {sum(len(o.data.vertices) for o in meshes)} verts weighted")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=False,
        export_yup=True,
        export_skins=True,
        export_animations=False,
        export_apply=False,
    )
    print(f"WROTE {OUT} ({OUT.stat().st_size} bytes)")


main()

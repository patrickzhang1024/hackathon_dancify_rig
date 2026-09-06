import argparse
from pathlib import Path
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "reference" / "Human_Primitive_Legacy" / "Assets"
TOES = ("big", "index", "middle", "ring", "little")

CHARACTERS = (
    {"name": "test_male", "profile": "Male", "detail": 4, "hand": 4, "feet": 5, "height": 1.78},
    {"name": "test_female", "profile": "Female", "detail": 4, "hand": 3, "feet": 6, "height": 1.65},
)

# Per-profile graft tuning. Male hands read larger; female feet read smaller. Each
# profile keeps its own authored (differently sized) armature and the grafted skin
# is bound to that armature.
HAND_SCALE = {"Male": 1.15, "Female": 1.0}
FOOT_WIDTH_SCALE = {"Male": 1.0, "Female": 0.8}
HAND_OVERLAP = 0.02  # metres the wrist rim sinks into the forearm to hide the seam
FOOT_OVERLAP = 0.05  # metres the ankle rim sinks into the shin to hide the seam


def load_objects(source_name, object_names):
    with bpy.data.libraries.load(str(SOURCE_DIR / source_name), link=False) as (_, data_to):
        data_to.objects = object_names
    for obj in data_to.objects:
        bpy.context.scene.collection.objects.link(obj)
    return data_to.objects


def remove_original_extremities(mesh, armature):
    wrist_x = abs(armature.data.bones["hand.L"].head_local.x)
    ankle_z = armature.data.bones["foot.L"].head_local.z
    remove_indices = {
        vertex.index for vertex in mesh.data.vertices
        if abs(vertex.co.x) > wrist_x + 0.02 or vertex.co.z < ankle_z - 0.015
    }
    body = bmesh.new()
    body.from_mesh(mesh.data)
    body.verts.ensure_lookup_table()
    bmesh.ops.delete(body, geom=[body.verts[index] for index in remove_indices], context="VERTS")
    body.to_mesh(mesh.data)
    body.free()


def _fix_winding(mesh_obj, transform):
    """A negative-determinant (mirror) transform inverts face winding, which makes the
    mirrored hand/foot render dark. Reverse the faces to restore outward normals."""
    if transform.determinant() >= 0:
        return
    flip = bmesh.new()
    flip.from_mesh(mesh_obj.data)
    bmesh.ops.reverse_faces(flip, faces=flip.faces)
    flip.to_mesh(mesh_obj.data)
    flip.free()


def smooth_mesh(obj):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new(name="Extremity detail", type="SUBSURF")
    modifier.levels = 1
    modifier.render_levels = 1
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def bind_mesh(obj, armature):
    obj.parent = armature
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.location = (0, 0, 0)
    obj.rotation_euler = (0, 0, 0)
    obj.scale = (1, 1, 1)
    modifier = obj.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = armature


def add_toe_bones(armature):
    bpy.ops.object.select_all(action="DESELECT")
    armature.hide_set(False)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    for side in ("L", "R"):
        source = armature.data.edit_bones[f"toe.{side}"]
        foot = armature.data.edit_bones[f"foot.{side}"]
        side_sign = 1 if side == "L" else -1
        offsets = (-0.045, -0.022, 0, 0.022, 0.042)
        lengths = (0.98, 1.0, 0.94, 0.86, 0.72)
        for name, offset, length in zip(TOES, offsets, lengths):
            bone = armature.data.edit_bones.new(f"toe_{name}.{side}")
            bone.head = (
                source.head.x + offset * side_sign,
                source.head.y,
                max(source.head.z, 0.018),
            )
            bone.tail = (
                source.head.x + offset * side_sign,
                source.head.y + (source.tail.y - source.head.y) * length,
                max(source.tail.z, 0.012),
            )
            bone.parent = foot
            bone.use_deform = True
    bpy.ops.object.mode_set(mode="OBJECT")
    for side in ("L", "R"):
        armature.data.bones[f"toe.{side}"].use_deform = False


def add_fixed_hands(armature, profile, version):
    source_mesh, source_armature = load_objects(
        "Hand.blend", [f"HAND_{version:02d}_Deform", "Deform_Rig"]
    )
    source_root = source_armature.data.bones["hand.L"]
    target_root = armature.data.bones["hand.L"]
    scale = target_root.length / source_root.length * HAND_SCALE[profile]
    align = target_root.matrix_local @ Matrix.Scale(scale, 4) @ source_root.matrix_local.inverted()
    # Sink the wrist rim a little way back up the forearm so the seam is hidden.
    proximal = (target_root.head_local - target_root.tail_local).normalized() * HAND_OVERLAP
    align = Matrix.Translation(proximal) @ align

    hands = []
    for side in ("L", "R"):
        hand = source_mesh.copy()
        hand.data = source_mesh.data.copy()
        bpy.context.scene.collection.objects.link(hand)
        for modifier in list(hand.modifiers):
            hand.modifiers.remove(modifier)
        transform = align if side == "L" else Matrix.Scale(-1, 4, Vector((1, 0, 0))) @ align
        hand.data.transform(transform)
        _fix_winding(hand, transform)
        hand.name = f"Hand{version}.{side}"
        if side == "R":
            for group in hand.vertex_groups:
                if group.name.endswith(".L"):
                    group.name = group.name[:-2] + ".R"
        smooth_mesh(hand)
        bind_mesh(hand, armature)
        hands.append(hand)

    bpy.data.objects.remove(source_mesh, do_unlink=True)
    bpy.data.objects.remove(source_armature, do_unlink=True)
    return hands


def add_fixed_feet(armature, profile, version):
    (source_mesh,) = load_objects("Feet.blend", [f"FEET_{version - 1:02d}"])
    minimum = Vector(tuple(min(vertex.co[axis] for vertex in source_mesh.data.vertices) for axis in range(3)))
    maximum = Vector(tuple(max(vertex.co[axis] for vertex in source_mesh.data.vertices) for axis in range(3)))
    top = [vertex.co for vertex in source_mesh.data.vertices if vertex.co.z > maximum.z - 0.08]
    source_anchor = sum(top, Vector()) / len(top)
    source_size = maximum - minimum
    feet = []

    for side in ("L", "R"):
        foot_bone = armature.data.bones[f"foot.{side}"]
        toe_bone = armature.data.bones[f"toe.{side}"]
        target_anchor = foot_bone.head_local
        scale_x = 0.14 * FOOT_WIDTH_SCALE[profile] / source_size.x
        scale_y = abs((toe_bone.tail_local.y - target_anchor.y) / (minimum.y - source_anchor.y))
        # Keep the sole on the ground while lifting the ankle rim up into the shin.
        scale_z = (target_anchor.z + FOOT_OVERLAP) / (source_anchor.z - minimum.z)
        mirror = -1 if side == "L" else 1
        transform = (
            Matrix.Translation(Vector((target_anchor.x, target_anchor.y, 0.0)))
            @ Matrix.Diagonal((mirror * scale_x, scale_y, scale_z, 1.0))
            @ Matrix.Translation(Vector((-source_anchor.x, -source_anchor.y, -minimum.z)))
        )

        foot = source_mesh.copy()
        foot.data = source_mesh.data.copy()
        bpy.context.scene.collection.objects.link(foot)
        for modifier in list(foot.modifiers):
            foot.modifiers.remove(modifier)
        foot.data.transform(transform)
        _fix_winding(foot, transform)
        foot.name = f"Feet{version}.{side}"
        smooth_mesh(foot)

        foot_group = foot.vertex_groups.new(name=f"foot.{side}")
        toe_groups = [foot.vertex_groups.new(name=f"toe_{name}.{side}") for name in TOES]
        toe_centers = [armature.data.bones[group.name].head_local.x for group in toe_groups]
        base_y = toe_bone.head_local.y
        blend_width = 0.025
        for vertex in foot.data.vertices:
            toe_weight = max(0, min(1, (base_y + blend_width - vertex.co.y) / (2 * blend_width)))
            if toe_weight < 1:
                foot_group.add([vertex.index], 1 - toe_weight, "REPLACE")
            if toe_weight > 0:
                nearest = min(range(len(toe_centers)), key=lambda index: abs(vertex.co.x - toe_centers[index]))
                toe_groups[nearest].add([vertex.index], toe_weight, "REPLACE")

        bind_mesh(foot, armature)
        feet.append(foot)

    bpy.data.objects.remove(source_mesh, do_unlink=True)
    return feet


def world_height(meshes):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        points.extend(evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices)
    floor = min(point.z for point in points)
    crown = max(point.z for point in points)
    return floor, crown


def expected_dotless_bones():
    names = {"spine", "spine001", "spine002", "spine003", "spine005", "spine006"}
    for side in ("L", "R"):
        names |= {
            f"shoulder{side}", f"upper_arm{side}", f"forearm{side}", f"hand{side}",
            f"thigh{side}", f"shin{side}", f"foot{side}", f"toe{side}",
        }
        for finger in ("thumb", "f_index", "f_middle", "f_ring", "f_pinky"):
            names |= {f"{finger}0{segment}{side}" for segment in (1, 2, 3)}
    return names


def fit_and_verify(name, armature, meshes, target_height):
    bpy.context.view_layer.update()
    floor, crown = world_height(meshes)
    scale = Matrix.Scale(target_height / (crown - floor), 4)
    armature.data.transform(scale)
    for obj in meshes:
        obj.data.transform(scale)
    bpy.context.view_layer.update()
    floor, _ = world_height(meshes)
    ground = Matrix.Translation(Vector((0, 0, -floor)))
    armature.data.transform(ground)
    for obj in meshes:
        obj.data.transform(ground)
    bpy.context.view_layer.update()

    actual_height = world_height(meshes)[1] - world_height(meshes)[0]
    if abs(actual_height - target_height) > 1e-4:
        raise RuntimeError(f"{name}: expected {target_height:.2f} m, got {actual_height:.6f} m")

    available = {bone.name.replace(".", "") for bone in armature.data.bones}
    missing = sorted(expected_dotless_bones() - available)
    if missing:
        raise RuntimeError(f"{name}: missing Mixamo52 source bones: {missing}")

    for obj in meshes:
        modifier = next((item for item in obj.modifiers if item.type == "ARMATURE"), None)
        if modifier is None or modifier.object != armature:
            raise RuntimeError(f"{name}: {obj.name} is not bound to the character armature")
        if any(not vertex.groups for vertex in obj.data.vertices):
            raise RuntimeError(f"{name}: {obj.name} contains unweighted vertices")

    print(f"OK: {name} is {actual_height:.2f} m and resolves all 52 Mixamo joints")


def export_body(character, output_dir):
    name = character["name"]
    profile = character["profile"]
    detail = character["detail"]
    source = SOURCE_DIR / f"{profile}_Human.blend"
    bpy.ops.wm.open_mainfile(filepath=str(source))

    mesh = bpy.data.objects[f"A_{profile}_{detail:02d}_Deform"]
    rigged_mesh = bpy.data.objects[f"A_{profile}_03_Deform"]
    armature = next(modifier.object for modifier in rigged_mesh.modifiers if modifier.type == "ARMATURE")
    modifier = next(modifier for modifier in mesh.modifiers if modifier.type == "ARMATURE")
    modifier.object = armature
    mesh.parent = armature
    mesh.location = (0, 0, 0)
    mesh.matrix_parent_inverse = Matrix.Identity(4)
    armature.location = (0, 0, 0)
    remove_original_extremities(mesh, armature)
    add_toe_bones(armature)
    extremities = (
        add_fixed_hands(armature, profile, character["hand"])
        + add_fixed_feet(armature, profile, character["feet"])
    )
    meshes = (mesh, *extremities)
    mesh.name = f"{name}_Body"
    armature.name = f"{name}_Rig"
    fit_and_verify(name, armature, meshes, character["height"])

    bpy.ops.object.select_all(action="DESELECT")
    for obj in (armature, *meshes):
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature

    output = output_dir / f"{name}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_all_influences=True,
    )
    print(f"Exported {output.relative_to(ROOT)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "assets" / "models")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    args.output.mkdir(parents=True, exist_ok=True)

    for character in CHARACTERS:
        export_body(character, args.output)


if __name__ == "__main__":
    main()
import argparse
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "reference" / "Human_Primitive_Legacy-master" / "Assets"
COMPONENT_SOURCES = {
    "hand": ("Hand.blend", [f"HAND_{index:02d}" for index in range(1, 9)]),
    "feet": ("Feet.blend", [f"FEET_{index:02d}" for index in range(8)]),
}


def export_body(profile, detail, output_dir):
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

    bpy.ops.object.select_all(action="DESELECT")
    for obj in (mesh, armature):
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature

    output = output_dir / f"{profile.lower()}-{detail}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_all_influences=True,
    )
    print(f"Exported {output.relative_to(ROOT)}")


def export_component(category, source_name, object_name, variant, output_dir):
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE_DIR / source_name))
    obj = bpy.data.objects[object_name]

    minimum = Vector(tuple(min(corner[axis] for corner in obj.bound_box) for axis in range(3)))
    maximum = Vector(tuple(max(corner[axis] for corner in obj.bound_box) for axis in range(3)))
    obj.data.transform(Matrix.Translation(-(minimum + maximum) / 2))
    obj.location = (0, 0, 0)
    obj.rotation_euler = (0, 0, 0)
    obj.scale = (1, 1, 1)
    obj.parent = None
    obj.matrix_parent_inverse = Matrix.Identity(4)

    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.hide_render = False
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    output = output_dir / f"{category}-{variant}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_apply=True,
    )
    print(f"Exported {output.relative_to(ROOT)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "assets" / "models")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    args.output.mkdir(parents=True, exist_ok=True)
    component_output = args.output.parent / "components"
    component_output.mkdir(parents=True, exist_ok=True)
    for output in component_output.glob("*.glb"):
        output.unlink()

    for profile in ("Male", "Female"):
        for detail in range(1, 5):
            export_body(profile, detail, args.output)
    for category, (source_name, objects) in COMPONENT_SOURCES.items():
        for variant, object_name in enumerate(objects, start=1):
            export_component(category, source_name, object_name, variant, component_output)


if __name__ == "__main__":
    main()
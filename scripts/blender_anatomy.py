"""Native verification of procedural component studies; no anatomical assets imported."""
import bpy
import json
import os
import sys
from pathlib import Path
from mathutils import Quaternion
sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_studio import create_studio, visible_asset_meshes

source, destination = map(Path, sys.argv[sys.argv.index('--') + 1:])
reports = []
for component in ('hand', 'forearm'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source / f'{component}-baked.glb'))
    armatures = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    assert len(armatures) == 1, 'Expected one imported deformation rig'
    rig = armatures[0]
    assert len(rig.data.bones) == 17
    meshes = visible_asset_meshes(list(bpy.context.scene.objects))
    assert meshes and all(o.data.uv_layers for o in meshes)
    assert all(any(m.type == 'ARMATURE' for m in o.modifiers) for o in meshes)
    normal_nodes = [n for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type == 'NORMAL_MAP']
    assert len(normal_nodes) >= 6
    images = list(bpy.data.images)
    assert images and all(i.has_data for i in images)
    assert all(i.colorspace_settings.name == 'Non-Color' for i in images), [i.colorspace_settings.name for i in images]
    names = [a.name for a in bpy.data.actions]
    assert any('Grasp' in a for a in names) and any('WristFlex' in a for a in names)
    if rig.animation_data:
        rig.animation_data.action = None
        for track in rig.animation_data.nla_tracks:
            track.mute = True
    for bone in rig.pose.bones:
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = Quaternion()
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    finger = next(o for o in meshes if o.name == 'Index')
    def evaluated_positions(obj):
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        try:
            return [evaluated.matrix_world @ v.co for v in mesh.vertices]
        finally:
            evaluated.to_mesh_clear()
    before = evaluated_positions(finger)
    bone = rig.pose.bones['Index_PIP']
    bone.rotation_quaternion = Quaternion((1, 0, 0), .7)
    bpy.context.view_layer.update()
    after = evaluated_positions(finger)
    displacement = max((a - b).length for a, b in zip(before, after))
    assert displacement > .005, displacement
    bone.rotation_quaternion = Quaternion()
    bpy.context.view_layer.update()
    restored = evaluated_positions(finger)
    restore_error = max((a - b).length for a, b in zip(before, restored))
    assert restore_error < 1e-6, restore_error
    studio = create_studio(meshes)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
    for layer in scene.view_layers:
        layer.cycles.use_denoising = False
    for action in bpy.data.actions:
        action.use_fake_user = True
    bpy.ops.file.pack_all()
    folder = destination / component
    folder.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str((folder / 'blender-preview.png').resolve())
    scene.render.image_settings.file_format = 'PNG'
    blend = (folder / f'{component}-baked.blend').resolve()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    assert all(i.packed_file for i in bpy.data.images if i.source == 'FILE')
    bpy.ops.render.render(write_still=True)
    report = dict(commit=os.environ.get('GITHUB_SHA', 'local'), component=component,
                  blender=bpy.app.version_string, bones=17, meshes=len(meshes), normal_nodes=len(normal_nodes),
                  packed_images=len(images), actions=names, deformation_distance_m=displacement,
                  restored_error_m=restore_error, native_saved=True, native_reopened=True,
                  rendered=True, studio=studio)
    (folder / 'validation.json').write_text(json.dumps(report, indent=2))
    reports.append(report)
print('ANATOMY_BLENDER_OK', json.dumps(reports))

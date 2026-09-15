"""Verify the reference character in native Blender and save the lit, packed scene."""
import sys
import json
import math
import traceback
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_rig import deformation_check, add_ik_controls

def build(source, destination):
    folder = destination / source.stem
    folder.mkdir(parents=True, exist_ok=True)
    report = dict(commit=__import__('os').environ.get('GITHUB_SHA','local'),blender=bpy.app.version_string,model=source.stem)
    try:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(source))
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        rigs = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
        assert meshes and rigs, 'Imported geometry or rig missing'
        bone_count = sum(len(r.data.bones) for r in rigs)
        assert bone_count >= 50, 'Incomplete anatomical skeleton'
        assert all(o.data.uv_layers for o in meshes), 'Missing UV layer'
        assert all(math.isfinite(c) for o in meshes for v in o.data.vertices for c in v.co)
        skin = next(o for o in meshes if o.name == 'AnatomicalSkin')
        movement = deformation_check(skin)
        images = [im for im in bpy.data.images if im.type == 'IMAGE' and im.size[0] > 0]
        assert len(images) >= 10, 'Embedded PBR maps missing'
        actions = [a.name for a in bpy.data.actions]
        for name in ['Idle', 'Walk', 'Wave']:
            assert any(name in action for action in actions), f'Missing {name} animation'
        assert any(o.data.shape_keys for o in meshes), 'Breathing shape key missing'
        controls = []
        for rig in rigs:
            controls.extend(add_ik_controls(rig))
            rig.show_in_front = True
        report.update(meshes=len(meshes),bones=bone_count,uv_meshes=len(meshes),images=len(images),actions=actions,deformation_distance_m=movement,ik_controls=controls)
        scene = bpy.context.scene
        points = [o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]
        low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
        high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
        center = (low + high) * .5
        radius = (high - low).length * .5
        camera_data = bpy.data.cameras.new('StudioCamera')
        camera = bpy.data.objects.new('StudioCamera', camera_data)
        scene.collection.objects.link(camera)
        camera.location = center + Vector((.85, -3.5, .15)) * radius
        camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera_data.lens = 48
        scene.camera = camera
        for name, offset, energy, size in [('Key', (-3,-4,4),650,3),('Fill',(4,-2,2),250,4),('Rim',(1,3,3),550,2)]:
            data = bpy.data.lights.new(name, 'AREA')
            data.energy = energy * radius ** 2
            data.shape = 'DISK'
            data.size = size * radius
            light = bpy.data.objects.new(name, data)
            scene.collection.objects.link(light)
            light.location = center + Vector(offset) * radius
            light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
        scene.world = bpy.data.worlds.new('StudioWorld')
        scene.world.use_nodes = True
        scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.38,.39,.40,1)
        scene.world.node_tree.nodes['Background'].inputs[1].default_value = .35
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = 24
        scene.cycles.use_denoising = False
        scene.render.threads_mode = 'FIXED'
        scene.render.threads = 2
        scene.render.resolution_x, scene.render.resolution_y = 720, 900
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(folder / 'blender-preview.png')
        bpy.ops.file.pack_all()
        blend = folder / f'{source.stem}.blend'
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        report['native_saved'] = True
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        assert bpy.context.scene.camera and len([o for o in bpy.context.scene.objects if o.type == 'LIGHT']) == 3
        unpacked = [im.name for im in bpy.data.images if im.type == 'IMAGE' and im.size[0] > 0 and not im.packed_file]
        assert not unpacked, f'Unpacked images: {unpacked}'
        report.update(native_reopened=True,studio_lights=3,textures_packed=True)
        (folder / 'blender-validation.json').write_text(json.dumps(report,indent=2))
        bpy.ops.render.render(write_still=True)
        report['rendered'] = True
        (folder / 'blender-validation.json').write_text(json.dumps(report,indent=2))
        print('REFERENCE_BLENDER_OK',json.dumps(report),flush=True)
    except Exception:
        report['error'] = traceback.format_exc()
        (folder / 'blender-validation.json').write_text(json.dumps(report,indent=2))
        raise

if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:]
    build(Path(args[0]).resolve() / 'reference-explorer/reference-explorer.glb', Path(args[1]).resolve())

"""Verify the reference character in native Blender and save its packed lit scene."""
import sys
import json
import math
import traceback
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_rig import deformation_check, add_ik_controls
from blender_studio import create_studio

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
        movement = deformation_check(next(o for o in meshes if o.name == 'AnatomicalSkin'))
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
        report.update(create_studio(meshes))
        scene = bpy.context.scene
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = 48
        scene.cycles.use_denoising = False
        scene.render.threads_mode = 'FIXED'
        scene.render.threads = 2
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(folder / 'blender-preview.png')
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(folder / f'{source.stem}.blend'))
        report['native_saved'] = True
        bpy.ops.wm.open_mainfile(filepath=str(folder / f'{source.stem}.blend'))
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

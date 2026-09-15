"""Verify a real imported armature and save a packed native rig, inside Blender."""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector, Matrix


def deformation_check(mesh):
    armature = mesh.find_armature()
    if armature is None:
        raise AssertionError('Skinned mesh has no armature modifier')
    bone = armature.pose.bones.get('L_UpperArm')
    if bone is None:
        raise AssertionError('Expected upper-arm bone missing')
    animation = armature.animation_data
    action = animation.action if animation else None
    tracks = [(t, t.mute) for t in animation.nla_tracks] if animation else []
    if animation:
        animation.action = None
        for track, _ in tracks:
            track.mute = True
    basis = bone.matrix_basis.copy()
    def positions():
        bpy.context.view_layer.update()
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        data = evaluated.to_mesh()
        points = [evaluated.matrix_world @ v.co.copy() for v in data.vertices]
        evaluated.to_mesh_clear()
        return points
    try:
        before = positions()
        bone.matrix_basis = basis @ Matrix.Rotation(0.45, 4, 'Z')
        after = positions()
        movement = max((a - b).length for a, b in zip(before, after))
        if movement <= 0.001:
            raise AssertionError('Blender armature did not deform the imported mesh')
        return movement
    finally:
        bone.matrix_basis = basis
        if animation:
            animation.action = action
            for track, mute in tracks:
                track.mute = mute
        bpy.context.view_layer.update()


def add_ik_controls(armature):
    """Inactive by default, preserving imported FK animation."""
    created = []
    for side in ['L', 'R']:
        for limb, joint, end in [('Hand', 'Forearm', 'Hand'), ('Foot', 'Shin', 'Foot')]:
            bone = armature.pose.bones.get(f'{side}_{joint}')
            tip = armature.pose.bones.get(f'{side}_{end}')
            if not bone or not tip:
                continue
            target = bpy.data.objects.new(f'CTRL_{side}_{limb}', None)
            bpy.context.scene.collection.objects.link(target)
            target.empty_display_type = 'SPHERE'
            target.empty_display_size = 0.05
            target.location = armature.matrix_world @ tip.head
            constraint = bone.constraints.new('IK')
            constraint.name = 'Workshop IK (enable influence to pose)'
            constraint.target = target
            constraint.chain_count = 2
            constraint.use_stretch = False
            constraint.influence = 0.0
            created.append(target.name)
    return created


def render_preview(folder, meshes):
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (low + high) * 0.5
    radius = max((high - low).length * 0.5, 0.1)
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new('Review camera')
    camera = bpy.data.objects.new('Review camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = center + Vector((2.2, -4.4, 1.5)) * radius
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.lens = 52
    scene.camera = camera
    for name, offset, energy, size in [('Key', (2, -3, 4), 450, 3), ('Fill', (-3, -1, 2), 250, 4), ('Rim', (1, 3, 3), 400, 3)]:
        data = bpy.data.lights.new(name, 'AREA')
        data.energy = energy * radius * radius
        data.shape = 'DISK'
        data.size = size * radius
        light = bpy.data.objects.new(name, data)
        scene.collection.objects.link(light)
        light.location = center + Vector(offset) * radius
        light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
    scene.world = bpy.data.worlds.new('Review world')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.16, 0.18, 0.2, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.5
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    # Ubuntu's Blender build does not include OpenImageDenoiser. Rendering itself works.
    scene.cycles.use_denoising = False
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2
    scene.render.resolution_x = scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(folder / 'blender-preview.png')
    bpy.ops.render.render(write_still=True)


def build_asset(path, destination):
    folder = destination / path.stem
    folder.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    armatures = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    if not meshes:
        raise AssertionError('No imported meshes')
    for obj in meshes:
        if not obj.data.uv_layers:
            raise AssertionError(f'{obj.name}: missing UV layer')
        for vertex in obj.data.vertices:
            if not all(math.isfinite(v) for v in vertex.co):
                raise AssertionError('Non-finite vertex')
    image_nodes = [node for mat in bpy.data.materials if mat.use_nodes for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image]
    report = {'blender': bpy.app.version_string, 'model': path.stem, 'meshes': len(meshes), 'armatures': len(armatures),
              'bones': sum(len(o.data.bones) for o in armatures), 'uv_meshes': len(meshes), 'image_nodes': len(image_nodes),
              'actions': [a.name for a in bpy.data.actions], 'shape_keys': [o.name for o in meshes if o.data.shape_keys], 'ik_controls': []}
    if len(image_nodes) < 3 or not armatures or not bpy.data.actions or not report['shape_keys']:
        raise AssertionError('Textures, rig, animation, or morph data missing in Blender')
    arm = next(o for o in meshes if o.name == 'L_ForearmMesh')
    report['deformation_distance_m'] = deformation_check(arm)
    for armature in armatures:
        report['ik_controls'] += add_ik_controls(armature)
        armature.show_in_front = True
    bpy.ops.file.pack_all()
    blend = folder / f'{path.stem}.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    report['native_reopened'] = True
    (folder / 'blender-validation.json').write_text(json.dumps(report, indent=2))
    render_preview(folder, [o for o in bpy.context.scene.objects if o.type == 'MESH'])
    print('WORKSHOP_BLENDER_RIG_OK', json.dumps(report), flush=True)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    directory = Path(args[0] if args else 'dist/assets').resolve()
    destination = Path(args[1] if len(args) > 1 else 'blender-assets').resolve()
    build_asset(directory / 'rigged-explorer/rigged-explorer.glb', destination)

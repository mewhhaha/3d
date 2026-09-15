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
def editable_cage(data, rig):
    assert data['format'] == 'procedural-quad-cage' and data['version'] == 1
    assert data['up'] == 'Y' and data['units'] == 'meters'
    collection = bpy.data.collections.new('Construction source - enable to edit')
    bpy.context.scene.collection.children.link(collection)
    mesh = bpy.data.meshes.new('Hand control quads')
    # Match glTF Y-up to Blender Z-up, independently of imported object transforms.
    mesh.from_pydata([(x,-z,y) for x,y,z in data['points']], [], [f['vertices'] for f in data['faces']])
    mesh.update()
    obj = bpy.data.objects.new('EditableHandCage', mesh)
    collection.objects.link(obj)
    uv = mesh.uv_layers.new(name='ControlFaceAtlas')
    for polygon, face in zip(mesh.polygons, data['faces']):
        assert len(polygon.vertices) == 4
        polygon.use_smooth = True
        for loop, pair in zip(polygon.loop_indices, face['uv']):
            uv.data[loop].uv = pair
    groups = {j['name']:obj.vertex_groups.new(name=j['name']) for j in data['joints']}
    for i, weights in enumerate(data['weights']):
        for name, weight in weights:
            groups[name].add([i], weight, 'REPLACE')
    deform = obj.modifiers.new('Deformation skeleton', 'ARMATURE')
    deform.object = rig
    sub = obj.modifiers.new('Editable Catmull-Clark surface', 'SUBSURF')
    sub.subdivision_type = 'CATMULL_CLARK'
    sub.levels, sub.render_levels = data['subdivision']['viewport'], data['subdivision']['render']
    sub.uv_smooth = 'NONE'
    obj['source_notes'] = data['notes']
    # Keep the construction object separate from the validated evaluated asset.
    collection.hide_render = True
    collection.hide_viewport = True
    return dict(object=obj.name,quads=len(mesh.polygons),vertices=len(mesh.vertices),
                groups=len(groups),subdivision_levels=sub.levels,render_levels=sub.render_levels,
                hidden_source_collection=collection.name)

for component in os.environ.get('STUDIES', 'hand,forearm,arm,cage-hand').split(','):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source / f'{component}-baked.glb'))
    armatures = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    assert len(armatures) == 1, 'Expected one imported deformation rig'
    rig = armatures[0]
    expected_bones = 19 if component == 'arm' else 17
    assert len(rig.data.bones) == expected_bones
    meshes = visible_asset_meshes(list(bpy.context.scene.objects))
    assert meshes and all(o.data.uv_layers for o in meshes)
    assert all(any(m.type == 'ARMATURE' for m in o.modifiers) for o in meshes)
    normal_nodes = [n for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type == 'NORMAL_MAP']
    assert len(normal_nodes) >= (1 if component == 'cage-hand' else 6)
    # Only material-referenced textures are asset images, not render buffers.
    images = list({node.image for material in bpy.data.materials if material.use_nodes
                   for node in material.node_tree.nodes
                   if node.type == 'TEX_IMAGE' and node.image is not None})
    assert len(images) >= (1 if component == 'cage-hand' else 6), 'Missing referenced normal textures'
    for image in images:
        # Accessing pixels verifies decoding even when image data was lazy-loaded.
        assert len(image.pixels) > 0, (image.name, image.source, tuple(image.size))
        assert image.has_data and image.size[0] > 0 and image.size[1] > 0, image.name
    assert all(i.colorspace_settings.name == 'Non-Color' for i in images), [i.colorspace_settings.name for i in images]
    names = [a.name for a in bpy.data.actions]
    assert any('Grasp' in a for a in names) and any('WristFlex' in a for a in names)
    if rig.animation_data:
        rig.animation_data.action = None
        for track in rig.animation_data.nla_tracks:
            track.mute = True
    for bone in rig.pose.bones:
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = Quaternion((1.0, 0.0, 0.0, 0.0))
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    finger = next(o for o in meshes if o.name == ('ContinuousHand' if component == 'cage-hand' else 'Index'))
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
    bone.rotation_quaternion = Quaternion((1.0, 0.0, 0.0, 0.0))
    bpy.context.view_layer.update()
    restored = evaluated_positions(finger)
    restore_error = max((a - b).length for a, b in zip(before, restored))
    assert restore_error < 1e-6, restore_error
    elbow_displacement = None
    if component == 'arm':
        arm_skin = next(o for o in meshes if o.name == 'ArmSkin')
        initial = evaluated_positions(arm_skin)
        elbow = rig.pose.bones['Elbow']
        elbow.rotation_quaternion = Quaternion((1, 0, 0), 1.0)
        bpy.context.view_layer.update()
        posed = evaluated_positions(arm_skin)
        elbow_displacement = max((a-b).length for a,b in zip(initial,posed))
        assert elbow_displacement > .1, elbow_displacement
        elbow.rotation_quaternion = Quaternion((1.0, 0.0, 0.0, 0.0))
        bpy.context.view_layer.update()
        assert max((a-b).length for a,b in zip(initial,evaluated_positions(arm_skin))) < 1e-6
    source_info = editable_cage(json.loads((source/'cage-hand-source.json').read_text()),rig) if component == 'cage-hand' else None
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
    if source_info:
        editable=bpy.data.objects['EditableHandCage']
        assert len(editable.data.polygons)==350 and all(len(p.vertices)==4 for p in editable.data.polygons)
        assert editable.modifiers['Editable Catmull-Clark surface'].type=='SUBSURF'
        assert len(editable.vertex_groups)==17
    assert all(i.packed_file for i in bpy.data.images if i.source == 'FILE')
    bpy.ops.render.render(write_still=True)
    report = dict(commit=os.environ.get('GITHUB_SHA', 'local'), component=component,
                  blender=bpy.app.version_string, bones=expected_bones, elbow_deformation_m=elbow_displacement, meshes=len(meshes), normal_nodes=len(normal_nodes),
                  packed_images=len(images), actions=names, deformation_distance_m=displacement,
                  restored_error_m=restore_error, native_saved=True, native_reopened=True,
                  rendered=True, studio=studio, editable_source=source_info)
    (folder / 'validation.json').write_text(json.dumps(report, indent=2))
    reports.append(report)
print('ANATOMY_BLENDER_OK', json.dumps(reports))

"""Scene-owned studio; frame evaluated vertices, not stale rest-pose bounds."""
import bpy
from mathutils import Vector

def create_studio(objects, occupancy=.84):
    scene=bpy.context.scene
    scene.render.resolution_x,scene.render.resolution_y=720,900
    scene.render.resolution_percentage=100
    bpy.context.view_layer.update()
    points=[]
    for obj in objects:
        evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh=evaluated.to_mesh()
        points.extend(evaluated.matrix_world@v.co for v in mesh.vertices)
        evaluated.to_mesh_clear()
    assert points and .2<=occupancy<=.95
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center=(low+high)*.5
    radius=max((high-low).length*.5,.01)
    data=bpy.data.cameras.new('StudioCamera')
    camera=bpy.data.objects.new('StudioCamera',data)
    scene.collection.objects.link(camera)
    direction=Vector((.24,-1,.06)).normalized()
    camera.location=center+direction*radius*5
    camera.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO'
    data.sensor_fit='HORIZONTAL'
    projected=[camera.rotation_euler.to_matrix().transposed()@(p-center) for p in points]
    width=max(p.x for p in projected)-min(p.x for p in projected)
    height=max(p.y for p in projected)-min(p.y for p in projected)
    data.ortho_scale=max(width,height*.8)/occupancy
    data.clip_start,data.clip_end=radius*.01,radius*30
    scene.camera=camera
    for name,offset,energy,size in [('Key',(-3,-4,4),850,3),('Fill',(4,-2,2),350,4),('Rim',(1,3,3),700,2)]:
        lamp=bpy.data.lights.new(name,'AREA')
        lamp.energy,lamp.size,lamp.shape=energy*radius**2,size*radius,'DISK'
        light=bpy.data.objects.new(name,lamp)
        scene.collection.objects.link(light)
        light.location=center+Vector(offset)*radius
        light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=radius*200,location=(center.x,center.y,low.z-radius*.003))
    floor=bpy.context.object
    floor.name='StudioFloor'
    material=bpy.data.materials.new('Studio matte')
    material.use_nodes=True
    material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.62,.60,.56,1)
    material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.92
    floor.data.materials.append(material)
    scene.world=bpy.data.worlds.new('StudioWorld')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.57,.60,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    bpy.context.view_layer.update()
    from bpy_extras.object_utils import world_to_camera_view
    ndc=[world_to_camera_view(scene,camera,p) for p in points]
    bounds=[[min(p[i] for p in ndc),max(p[i] for p in ndc)] for i in range(2)]
    fill=max(b-a for a,b in bounds)
    assert .70<=fill<=.94, bounds
    assert all(-.01<=v<=1.01 for pair in bounds for v in pair), bounds
    return dict(camera_fill=fill,camera_bounds=bounds,floor=floor.name,evaluated_bounds=[list(low),list(high)])

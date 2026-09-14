"""Import real GLBs in background Blender, audit UVs/images, save packed .blend files."""
import bpy
import json
import sys
from pathlib import Path

args=sys.argv[sys.argv.index('--')+1:]
source=Path(args[0]).resolve()
out=Path(args[1]).resolve()
out.mkdir(parents=True,exist_ok=True)
reports=[]
for model in ('atelier-bust','field-explorer'):
    path=source/model/(model+'-fine.glb')
    if not path.is_file():
        raise FileNotFoundError(path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert meshes, f'{model}: missing mesh data'
    assert all(o.data.uv_layers for o in meshes), f'{model}: UVs lost on import'
    images=[im for im in bpy.data.images if im.type=='IMAGE' and im.size[0]>0]
    assert len(images)>=3, f'{model}: missing embedded textures'
    assert all(p.loop_total==3 for o in meshes for p in o.data.polygons), 'Expected evaluated triangles'
    materials=[m for m in bpy.data.materials if m.use_nodes]
    textures=sum(n.type=='TEX_IMAGE' for m in materials for n in m.node_tree.nodes)
    assert textures>=3, 'Texture material nodes missing'
    bpy.ops.file.pack_all()
    destination=out/(model+'.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(destination))
    report={'model':model,'blender':bpy.app.version_string,'meshes':len(meshes),'images':len(images),'materials':len(materials),'textureNodes':textures,'uvMeshes':len(meshes),'blend':destination.name}
    reports.append(report)
    print(json.dumps(report))
(out/'blender-report.json').write_text(json.dumps(reports,indent=2))

# Rigging and animation API

This extends the existing organic modeling, UV and PBR work. `field-explorer` remains a static reference; `rigged-explorer` reuses its geometry and materials rather than substituting another character.

## Implemented

The new recipe has 38 joints: root, hips, spine, chest, neck, head, arm/hand and leg/foot chains, and two joints per digit. All mesh parts have normalized skin weights and the existing UVs/materials. It includes Idle, Walk, Wave and Grasp clips and a breathing shape key on the jacket. The walk is an illustrative in-place cycle, not contact-solved locomotion. Large poses may expose limitations in segmented clothing and joint topology. This is not a production face rig or an arbitrary-mesh automatic rigger.

The viewer preserves the surface/UV/reference workbench and adds a skeleton overlay, clip selection, play/pause, time scrubbing and speed. Browser hooks are `studio.setAnimation(name,time)`, `studio.seek(time)` and `studio.rigInfo()`.

## Reusable API

`src/lib/rigging.js` exports:

| Function | Contract |
| --- | --- |
| `skeleton(joints)` | Unique named joints, parents before children, absolute model-space bind positions. Returns root bone, Skeleton, named bones and indices. |
| `skin(geometry, material, rig, weights, name)` | Geometry must already be in model/bind space. Weight callback returns one to four `[jointName, weight]` pairs per vertex. Invalid assignments fail; valid weights are normalized. |
| `skinnedPart(mesh, rig, weights)` | Bakes a mesh's local transform before skinning; not a general nested-hierarchy bake. |
| `jointBlend(a,b,axis,center,width)` | Smooth two-bone transition in an explicit coordinate interval. |
| `rotationTrack(bone, keys)` | Quaternion animation from `[seconds, [x,y,z degrees]]` keys. |
| `clip(name, tracks)` | Validated Three.js AnimationClip. |
| `morphTarget(mesh,name,deltaFunction)` | Adds a relative position morph; callback returns a Vector3 delta. |
| `assetInfo(root)` | Validates UV and skin attributes and reports joints, skinned meshes, textures, morphs and clips. |

```js
import { THREE, group } from '../src/lib/modeling.js';
import { skeleton, skin, jointBlend, rotationTrack, clip } from '../src/lib/rigging.js';

const rig = skeleton([
  { name: 'Root', position: [0, 0, 0] },
  { name: 'Tip', parent: 'Root', position: [0, 1, 0] },
]);
const geometry = new THREE.CylinderGeometry(.1, .1, 2, 24, 24);
geometry.translate(0, 1, 0);
const surface = new THREE.MeshStandardMaterial({ color: '#74968b' });
const flexible = skin(geometry, surface, rig,
  jointBlend('Root', 'Tip', 'y', 1, .3), 'FlexiblePart');
const model = group('Flexible asset', [rig.root, flexible]);
model.animations = [clip('Bend', [rotationTrack('Tip', [
  [0, [0, 0, 0]], [1, [0, 0, 40]], [2, [0, 0, 0]],
])])];
// Return model from a defineModel(...).build function.
```

Use meters, Y up, +Z forward. Convenience rotation keys are degrees; raw Three.js uses radians. The explorer binder uses authored part semantics and known landmarks, not nearest-bone guessing. It transforms those landmarks with the same height normalization as the original mesh.

## Export correctness

`src/lib/export-assets.js` rebuilds the selected recipe in its bind pose and explicitly exports all clips. It does not clone a live SkinnedMesh hierarchy or export the display scene. Skeleton overlays, clay/wireframe/UV modes, lights, floor and preview poses cannot leak into GLB. Procedural RGBA8 DataTextures are converted to export-owned canvas images while preserving color space, flip direction and UV transforms; this also fixes the exporter's non-unit normal-map conversion path. The live materials are untouched.

GLB preserves evaluated meshes, UVs, PBR maps, skeletons, weights, morph targets and keyframe clips. It does not preserve arbitrary Blender modifiers or reconstruct the JavaScript recipe as Geometry Nodes.

## Native Blender

`blender_rig.py` imports the rigged GLB, requires UV layers, image nodes, an armature, actions and shape keys, rotates a real imported pose bone and checks evaluated vertex movement, packs images, saves a BLEND and reopens it. It also makes a CPU Cycles preview. Actual Blender version and results go into `blender-validation.json`; never infer native success only from glTF validation.

The native rig gets four basic hand/foot IK target empties. Constraints start at **zero influence** to preserve imported FK animations. Enable influence to pose with them. No automatic IK/FK matching, pole-vector interface, Rigify conversion or advanced animator controls are claimed. Native files are CI default variants; browser parameter edits only affect the GLB download until another build runs.

The workflow keeps existing organic fine-model verification and adds rig-specific tests. Native BLEND files are in the **blender-assets** artifact; animation review images and GLB are in **model-assets**. The static Pages viewer previews the animations but does not run Blender or serve a generation API.

## Validation and limits

Run `npm test`, the existing build/bake/review commands, then `node scripts/check-rig.mjs`. The Blender job runs both the existing `blender_verify.py` and the new `blender_rig.py`. Tests cover source-mesh preservation, parameter-scaled bind positions, normalized weights, actual deformation, GLB skin/morph/animation data, source-versus-reimported posed vertex agreement, and export isolation from live poses.

This is an extensible asset pipeline, not all of Blender reimplemented in JavaScript. Cloth, collision-aware hair, muscle systems, automatic retopology, high-to-low baking, production facial rigs, arbitrary sculpt operations, physics and general Geometry Nodes authoring remain future per-model extensions through Blender Python. Use rendered silhouettes and motion reviews to assess quality; passing structural tests does not establish anatomical or photoreal accuracy.

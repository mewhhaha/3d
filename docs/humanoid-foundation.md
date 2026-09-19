# Humanoid foundation before costume

`models/humanoid-mannequin.js` is an **original code-authored proxy**, not an
Adobe/Mixamo asset, a MakeHuman mesh, or a rigged version of the cyber android.
Its purpose is to make body proportions and gesture cheap to inspect **without
armor, hair, a backpack, texture detail or dramatic lighting**. Keep the earlier
android recipes intact while evaluating this simpler foundation.

```sh
npm run render -- models/humanoid-mannequin.js --pose lookback --time .5 \
  --views front,threequarter,side --passes material,clay,silhouette --glb
npm run render -- models/humanoid-mannequin.js --params '{"build":"broad"}' \
  --pose contrapposto --time .5 --views front,side --glb
node scripts/review-humanoid.mjs
```

The model exports in a T bind pose with three named one-second **hold clips**:
`neutral`, `contrapposto`, `lookback`. Select a clip to see the solved pose. These
are not locomotion clips or contact-correct transitions. The render tool's pose,
skeleton, clay and camera controls are preview-only and do not alter export.

## Separate responsibilities

1. `humanoidProportions()` supplies measurements in meters. `slender` and `broad`
   are starting shapes, not sex/anatomy classifications. Both use the same joint
   layout. Height, shoulder span and hip-socket span can be edited independently.
2. `humanoidRig()` builds 28 conventional named bones in an absolute T-pose,
   using the existing `skeleton()` API. Root/hips/spine/neck/head, two clavicle-
   arm-forearm-hand chains, and two thigh-shin-foot-toe chains are connected.
3. `poseHumanoid()` applies section rotations and solves the four limb chains
   with the existing `twoLinkPose()`. Limb lengths and bind matrices do not change.
4. `humanoidMannequin()` binds low-resolution primary volumes via `skinnedPart()`:
   mostly rigid one-bone skin, with a blended waist. This is a segmented
   construction mannequin, **not continuous anatomical skin**.

Coordinate contract: Y up, +Z forward, +X the subject's left. Pose rotations are
XYZ degrees; shift and ground-target X/Z values are fractions of stature. Pose
solving occurs in untransformed model space, before scene placement. Placed rigs
fail explicitly. Root placement and animation retargeting are separate work.

```js
import {humanoidMannequin} from '../src/lib/humanoid-mannequin.js';
import {humanoidPose} from '../src/lib/humanoid-rig.js';

const stance = humanoidPose('contrapposto');
stance.head = [4, 22, -8];
const subject = humanoidMannequin({
  height: 1.72, build: 'slender',
  shoulderSpan: .37, hipSpan: .20,
  poses: {study: stance},
  segments: 16,
});
```

The API supports 1..16 named pose definitions. Clips contain every bone's
position and quaternion so selecting a new pose does not inherit an earlier
clip's state. Solves restore the previous state on failure; clip construction
returns to bind even when a later pose is unreachable. The feet retain a flat
planted datum for the provided poses. No mass-based balance, ground collision,
hand contact, finger joints, facial rig or general pose optimizer is implemented.
Custom joint names alone do **not** establish Mixamo animation compatibility.

## Export ownership

The mannequin opts into `exportSkinRoots`. At export, the new
`promoteExportSkinRoots()` stage puts model-space skinned meshes at actual glTF
scene roots while retaining their skeleton hierarchy and clips. The source
builder/preview is not modified. It requires identity bind/world transforms,
childless skin meshes and no mesh-node transform animation; it prevalidates all
selected meshes before moving any. Unrequested assets keep their old layout.

This removes the real `NODE_SKINNED_MESH_NON_ROOT` warning for the new mannequin
rather than ignoring it. glTF skinning ignores the skin mesh node's transform;
exporting a misleading nested transform hierarchy is not the intended contract.
The exporter disposes the entire owned export scene, including promoted skins.
The browser's in-memory module map includes this helper so local and UI exports
use the same code.

## What to judge next

Default proxy: **11,968 triangles, 34 parts, two standard materials, zero texture
maps, 28 bones**. This count is not an accuracy target. Use front/side silhouettes
and the pose board to decide stature, head scale, shoulder/pelvis width and
weight shift first. The pelvis/waist overlap and far hand occlusion still need
visual refinement. Do not polish the mannequin into another detailed robot.

Only after the foundation's form and pose are accepted should existing ceramic
parts be fitted to the named bones/supports. No such rebinding is claimed in this
checkpoint; the detailed android and its prior rigid pose controls are untouched.

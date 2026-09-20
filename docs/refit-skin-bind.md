# Change a rest shape without leaving its skeleton behind

`refitSkinBind(root, field, {step})` is an explicit **pre-pose bind edit** on an
owned model-space skin. The point field maps positions in meters and is applied
to both geometry and rest-joint positions. This is not a pose scale, remesh,
automatic weight solve, Mixamo retargeter or corrective animation shape key.

```js
// Build/load an OWNED rest rig, normalize its skin layout explicitly first.
refitSkinBind(subject, ([x,y,z]) => [x*.94, y*1.08, z*.90]);
// Author new clips against the new bone lengths only after the bind is refitted.
const controller = skeletonPose(subject, {names});
subject.animations = [controller.hold('study', pose => authorStance(pose))];
```

The existing `pointFields()`/`weightedTransform()` can compose local shape intent;
the refit operation does not know humanoid dimensions, axes, anatomical labels,
reference pixels or cameras. A smooth field is required. The Xbot example uses
existing scalar profiles to lengthen the leg region while reducing torso bulk;
the unrelated flexible-tail fixture sweeps and tapers a different rig.

## Explicit contract

- Call on an independently owned, unplaced root in its rest pose. All mesh parts
  must be ordinary indexed **identity-bound model-space skins**. Imported
  armature parents may retain their positive unit conversion/rotation; their
  matrices must be nonsingular, and bones must use automatic local TRS updates.
- Geometry/joint samples share one space. Authored local bone rotations/scales
  stay unchanged; new local translations are resolved parent first. Fresh
  inverse bind matrices are calculated from the new rest hierarchy.
- Geometry is cloned before replacement. Index, UV and weight attributes keep
  their values. The caller owns and may dispose the entire model; old owned
  geometry is disposed once, after a successful commit. Do not pass meshes or
  skeletons borrowed from another live asset.
- Normals use inverse-transpose finite-difference Jacobians, preserving split
  shading frames rather than averaging UV seams. `step` defaults to 1e-5 meters
  and must be in [1e-7,.001]. Tangents and high/low correspondence are invalidated.
- Existing clips, morphs, normal/bump/displacement maps and baked AO/light maps
  are rejected. They need deliberate retargeting/transfer/rebaking, not silent
  reuse. Color textures retain UVs but can stretch with the new surface.
- Validation and generated geometry precede assignment. Invalid fields, sampled
  folds, nonfinite data or failed joint updates restore the old bone positions
  and inverse binds and leave old geometry assigned.

A positive determinant at sampled vertices is **not** a global injectivity,
collision, watertightness or anatomical quality test. Retained weights are useful
for modest shape edits, not guaranteed correct for arbitrary proportion changes.
This operation changes rest lengths; all subsequent poses must solve against
those actual new lengths. A changed bind cannot reuse old translation tracks
as though nothing happened. The rig's topology/name layout is preserved, not
its old inverse bind matrices or deformation field.

## Actual examples and review

```sh
node scripts/render.mjs studies/imported-xbot.js \
  --params '{"form":"tailored"}' --pose silhouette --time .5 \
  --views hero,side --passes material,clay,silhouette
node scripts/render.mjs studies/refitted-tail.js --pose bend --time .5 --glb
node scripts/review-bind-form.mjs
```

`stock` remains the default. `tailored` is an explicit derivative of the pinned
Adobe/Mixamo source, not original workshop anatomy. The previous `neutral`,
`confident` and `poised` definitions remain unchanged; their clips are freshly
solved for whichever rest shape is chosen. New `silhouette` changes only the far
arm's target/shoulder attitude after `poised`. Camera and lighting stay fixed.
No new shaders, costume or triangle density are involved.

The review isolates rest-shape and pose changes, checks both T binds and side/
back views, compares retained attributes, and reimports every vertex in each
exported clip. It does not use the android's optical-module annotations as
anatomical joint truth. See the checkpoint for actual results and limitations.

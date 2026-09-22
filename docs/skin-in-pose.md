# Author a flexible part in its inspection pose

`skinInPose(geometry, material, skeleton, weights, options)` turns NEW geometry
built around a posed character into a bind-space `SkinnedMesh` on that same rig.
Use it where a rigid bone mount cannot bridge several moving body sections.

```js
// Geometry is authored in posed model-space meters, before scene placement.
const sleeve = skinInPose(posedShell, rubber, body.skeleton,
  p => [['LowerSpine', 1 - blend(p)], ['UpperSpine', blend(p)]],
  {name: 'Flexible connector'});
// Add beside the existing identity-bound skin, restore the captured bone pose,
// then preview/export using the existing clips and export-skin-root contract.
```

The caller supplies explicit named weights using the existing maximum-four
influence contract. For each vertex, the operation blends the current
`bone.matrixWorld * inverseBind` matrices, then inverts that BLENDED matrix to
recover a rest position. Inverting each bone separately and blending the results
would not be equivalent. This is inverse linear-blend construction, not automatic
weight transfer, a surface projection, remeshing or a normal bake.

The source geometry is cloned; its index and UV values are retained. Existing
skin or morph attributes and normal/bump/displacement materials are rejected.
The new geometry owns its buffers but intentionally shares the supplied skeleton
and material. No old mesh, clip, joint transform or inverse bind is rewritten.
Build in unplaced model coordinates with the current bone worlds updated.
Imported positive unit conversions work; invalid joint matrices, collapsed
blends and excessive sampled conditioning fail rather than inventing a result.
`minDeterminant` defaults to .05; a Frobenius condition bound of 100 also applies.

Normals reverse Three.js r186's linear skin-normal transform. This preserves
that renderer's authored normal directions in the construction pose; it is NOT
an inverse-transpose physical-shading guarantee for arbitrary scales. Tangents
and high/low correspondence are explicitly invalidated. Generate dependent
detail again, and inspect other poses: inverse construction guarantees neither
collision-free skin nor convincing deformation away from the authored pose.

## Two real users

`studies/armor-waist.js` constructs a tapered closed-perimeter waist sleeve in
the unchanged `upright` clip and assigns three spine owners. It closes the gap
between existing rib/pelvis pieces without another rigid floating plate.
`studies/posed-tail-sleeve.js` builds a corrugated cuff around an independently
authored bent appendage and returns it to that appendage's bind state.

The costume adds `flow: true` and optional `panelLines: true`. The latter reuses
`contourLineMaps` on thigh/shin exteriors, multiplied with the retained generated
enamel sample in linear space. Inner/rim surfaces remain unpainted. No extra
triangles create those pigment lines and no new image-generation result is used.
Previous options/defaults, pose and reference annotations remain unchanged.

```sh
node scripts/render.mjs studies/prism-armor-blockout.js \
  --params '{"fit":true,"head":true,"feet":true,"flow":true,"panelLines":true}' \
  --pose upright --time .5 --views hero,side --passes material,clay,silhouette --glb
node scripts/review-costume-flow.mjs
```

The review checks all old bone frames and source skin buffers, same-geometry
plain/pigment comparisons, and real textured GLB reloads. Export checks handle
multi-material primitive splits and verify every selected skin/rigid vertex plus
concatenated topology. Selection is explicit: validating the added waist does
not claim a new full-body animation certification.

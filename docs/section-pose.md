# Section poses: separate trunk gesture from shape and attachment data

`sectionPose(stations)` builds a reusable point field in **one Y-up authoring
space**. Each station has an increasing `y` in metres, an optional `offset` in
metres and `rotation` in XYZ degrees. No scene, vertex indices, anatomy dimensions,
materials or camera are part of this API.

```js
const pose = sectionPose([
  {y: -.4},
  {y: 0, offset: [.16, 0, .04], rotation: [8, 0, -20]},
  {y: .4, offset: [.25, 0, .06], rotation: [0, 35, 0]},
]);
const shapedSurface = (u, v) => pose.point(restSurface(u, v));
// A rigid flange was authored at y=.4 in this same space:
flange.applyMatrix4(pose.transform(.4));
// A socket belonging to that rigid section uses its section coordinate explicitly:
const socket = pose.point(restSocket, .4);
```

Translation uses smoothstep interpolation, orientation shortest-path quaternion
slerp. Rotation pivots around `[0,y,0]`, not the global origin. Outside the station
interval the terminal rigid transform continues, rather than pinning each vertex
to an endpoint. Input data and returned matrices/arrays are independently owned.
`transform(y)` is the **deformation matrix** for that section, not a placement
matrix already translated to its rest Y coordinate. Author a rigid part in rest
space first, then apply it.

Use this when several broad sections need different orientations/translations,
while a continuous support and its mounted details must follow the same edit.
A centerline sweep is still preferable when curvature alone describes the form;
a lattice is more general for non-axial volume edits. This field does not replace
either operation. It does not walk/mutate Object3D trees or silently skip geometry.

## Actual uses

- Android: pelvis/waist/ribs/cervical station data drive `torsoSupport` before
  contour meshing, thickening and hardware attachment. Proximal shoulder/hip
  positions use the same end-section frames. Existing `twoLinkPose` then solves
  entire limbs back to fixed wrist/ankle targets at the existing lengths. The body
  uses its original construction frame; refitting that frame again would apply
  the movement twice. `gestureStyle: counterpose` is independent of `poseStyle`
  and `jointStyle`. Old defaults remain unchanged.
- `studies/section-duct.js`: a mechanical duct sleeve follows three substantially
  different stations; rigid end flanges use those same transforms. No android
  dimensions or reference projection enter the reusable field.

`jointStyle: housed` is separate geometry: open annular hip/elbow cowls, a more
compact shoulder cowl and upper-arm shell clearance. It does not move hinge
origins. Existing emitters remain independent, with their previous names.

## Ownership and limits

Sampling a posed support creates new evaluated geometry. Constructors still own
indices, UVs, normals, tangent generation, thickness and material roles. This field
alone transfers no weights, morphs, baked normals or external topology-bound
anchors. Rebind/rebake those dependencies when the rest shape changes. The android
hair is untouched, and its existing normal-bake verification is not a limb claim.

This is not Blender B-Bones, skinning, runtime IK or a physical spine. Cross-section
rotation is authored rather than derived from a curve tangent; hard bends can fold
or stretch the volume, and smoothstep stops angular/offset velocity at each station.
It does not preserve volume/arc length or solve collisions/balance. The older torso
mount's nonuniform scale still affects evaluated thickness and metric socket
spacing; exact link lengths come from the separate two-link solve, not this field.

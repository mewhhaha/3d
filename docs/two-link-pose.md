# Connected two-link poses

`twoLinkPose({root, target, pole, lengths, swivel})` is a pure construction-stage
position solve. All coordinates are explicit in one caller-chosen space; units
are metres in this workshop. `swivel` is degrees around root-to-target.

```js
const pose = twoLinkPose({
  root: [0,.15,0], target: [.65,.70,.15], lengths: [.55,.43],
  pole: [-.2,.5,.5], swivel: 32,
});
// pose.root -> pose.joint -> pose.target
// mountSegment owns each rigid component; the shared joint is identical for both.
```

The law of cosines gives a circle of valid middle joints. The pole projected
perpendicular to the chain axis selects a point on that circle; swivel rotates
it. Both segment lengths and both endpoints remain fixed. Unreachable targets,
coincident endpoints, nonfinite data, and an axial pole for a bent chain throw.
An exactly extended chain is finite and needs no arbitrary bend direction.
There is no silent target clamp or stretch.

This is not a runtime skeletal IK rig, collision solver, joint-limit system,
or skin deformation operation. It returns owned position arrays and does not
modify geometry, transforms, targets, annotations, UVs or weights. Use it before
mounting rigid links or as input to a separately owned rig. Closed-loop mechanisms
and more than two links need other constraints.

## Android use

`poseStyle: relaxed` is an explicit, small posture hypothesis beside the unchanged
`reference` default. It lifts the near hand target 9 mm toward the shoulder,
solves the connected arm at the original .25/.30 m lengths, and swivels the bend
planes of both arms and legs. Hip, shoulder, ankle, torso, head and reactor anchors
remain fixed. Feet gain independent 6/-7 degree planar splay while retaining the
0.155 m deck contact. Observational reference annotations are not modified.

`limbStyle: scalloped` is independent: original mounts/pose or new pose can use it.
It rebuilds tapered upper-arm, forearm, thigh and calf supports, then samples
concave plates and mounts inserts on those supports. Foot instep, toe and ankle
forks are separate thickened contours. UVs belong to the newly constructed
supports; external anchors/weights/high-low correspondence must be rebound.
These shells have thickness; their underlying open-ended cores are not watertight
solids. Limb axial scaling inherited from the older fitting stage can still
elongate circular features and thickness. No normal-bake claim applies to limbs.

```sh
node scripts/review-limbs.mjs
npm run render -- models/cyber-form-study.js \
  --params '{"headStyle":"illustrated","bodyStyle":"articulated","limbStyle":"scalloped","poseStyle":"relaxed"}' \
  --views hero --size 768x1376 --glb
```

The independent `studies/two-link-boom.js` uses the same solver for a mechanical
inspection arm while keeping its base and sensor stationary. Separate construction
and pose controls avoid the earlier failure mode of rotating armor under unchanged
elbow/knee/hand mounts.

# Pose-aware costume fitting without changing the pose

The current costume study remains `studies/prism-armor-blockout.js`, built on the
actual tailored Adobe/Mixamo Xbot and its corrected `upright` clip. These optional
controls leave the previous blockout available:

```sh
node scripts/render.mjs studies/prism-armor-blockout.js \
  --params '{"fit":true,"head":true,"feet":true}' --pose upright --time .5 \
  --views hero,side --passes material,clay,silhouette --glb
node scripts/review-costume-forms.mjs
```

`fit` changes only chest/iliac supports and boundaries. `head` mounts the existing
workshop portrait/bob at coarse resolution on the imported head bone, and removes
only the old source head faces. `feet` replaces the rectangular boot placeholders
with contoured soles, a flexible upper and separate toe/instep plates. The source
pose definitions, proportions, lights, camera, skin attributes and inverse binds
are not reauthored. All old options default to their previous behavior.

## Snapshot a deformed support in an explicit space

`evaluatedSurfaceGeometry(mesh, {frame, includeFace})` produces an owned static
**query surface**, where `frame` maps destination coordinates to world. It calls
Three.js `getVertexPosition` (including skin and morph evaluation) rather than
assuming that the raw position buffer represents the visible surface. Update the
rig first. The optional face predicate receives the original face index and an
owned index triplet. Instancing, nonindexed input and invalid/reflected frames
are rejected.

The result has positions, indices and recomputed geometric normals. It deliberately
does not copy skin weights, morph targets, UVs, authored normal/tangent frames,
material groups or high/low correspondence. It is not a new animation asset or a
normal bake. Unreferenced positions can remain when filtering faces; bounds are
conservative. Dispose the snapshot after fitting. Original input buffers/bind data
remain untouched.

For a rigid bone-mounted plate, the fitting study evaluates the body at the chosen
clip, maps those points into the owner's **rest** model frame, then restores every
bone. The mapping is `M_rest * inverse(M_posed) * M_mesh`. This captures the
actual blended skin beneath a rigid owner instead of assuming all underlying
vertices follow that one bone. It is a build-time operation; changing proportions,
pose or source topology requires rebuilding the fit.

## Smooth panels, not copied skin creases

`studies/armor-pose-fit.js` projects a regular grid onto that query surface.
The current project-specific fitter restricts samples to the authored contour,
fits a fourth-order height polynomial, then adds a conservative sampled envelope
and clearance. Boundaries, support, thickness, material and bone mounting remain
separate. This is deliberately not a general shrinkwrap/collision system:

- The support must be a front-facing height field in the chosen model frame.
- Misses are counted and excluded; insufficient/singular samples fail.
- Clearance is along the projection direction, not a measured normal distance.
- The reported minimum/median/95th/max gaps are at fitting samples only. They are
  not a collision proof between samples or in other clips.
- The retained source weights can move differently in other poses. Rigid plates
  are not automatically reweighted or deformed to follow arbitrary animations.

The independently authored `posed-tail-guard` study exercises this same workflow
on a flexible four-bone appendage, rather than on another humanoid component.

## Reuse of head and foot construction

`roundedBob` accepts optional per-chart `segments` for crown/curtain/fringe;
`illustratedHead` accepts the existing portrait `detail` choice and `hairSegments`.
Old defaults and guides stay unchanged. The costume uses lower sampling density,
standard PBR materials, authored vertex normals, and the existing iris/strand
color textures. No new texture is claimed generated this pass. The approved
material-board color crops remain the shell look input.

Head removal changes source **index topology only**. The old face-region and
material-region metadata is explicitly invalidated, while position/normal/UV/
skin-weight buffers and the imported inverse binds remain intact. The replacement
head is a separately owned rigid component, not a retargeted facial rig. It has
no facial animation. The old head remains in the `head:false` variant.

The foot uses existing contour-volume and surface-thickness operations, with the
previous sole-bottom datum retained. This is still a rough multi-part shoe, not
a welded watertight print or a collision-tested mechanism. See the checkpoint
for visual defects, rejected fits and actual render/export results.

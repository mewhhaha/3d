# Concave armor contours on a shared surface

`surfaceContourGeometry(support, options)` is a construction operation, not a
mesh edit. It separates the contour's intent from the supporting volume and
from tessellation, thickness, attachment, and material assignment.

```js
const skin = surfaceContourGeometry(support, {
  outline: [[.1,.1],[.9,.1],[.9,.9],[.6,.9],[.6,.4],[.4,.4],[.4,.9],[.1,.9]],
  rounding: .12, cornerSegments: 4, refinement: 3, offset: .004,
});
const shell = solidifyGeometry(skin, {
  thickness: .003, offset: -1, regionPrefix: 'cover',
});
skin.dispose(); // shell has independent buffers
```

Outline points are in the support's normalized UV domain. The loop must be
simple, not self-touching, and have nonzero area. Concave notches are supported;
optional interior `holes` (up to 16 loops) are supported. Each must be strictly
inside the exterior and disjoint from other holes; touching, crossing and nested
holes fail. Multiple disconnected exteriors are not supported. Both authored and
rounded domains are validated. Winding is normalized to `du cross dv`, with holes
opposite the outer loop. Three.js r186 ShapeUtils triangulates the planar domain;
shared-edge subdivision happens **before** evaluation of the 3D support.
This prevents a coarse triangle from remaining a flat chord across a curved
volume when the user increases refinement.

`rounding` (0..0.35) trims that fraction of each adjacent UV edge and samples a
quadratic corner; it is not a metric bevel radius. `cornerSegments` is 1..12,
`refinement` is 0..6 with a 250,000 triangle budget. `offset` is a signed distance
in support-local meters. Support normals are differential, independent of its
sampled triangulation. The triangle mesh only approximates curvature; nonuniform
object scale changes physical clearance/thickness, and no self-intersection or
exact-even-thickness solver is provided. Invalid input and singular sampled
supports fail. A folded support can still overlap away from sampled vertices.

Every call owns fresh geometry and support UVs. This operation has **no input
mesh**, so no incoming rig weights, anchors, morphs or high/low correspondence
are silently transferred. Rebind dependents after changing the outline or
resolution. The construction metadata keeps the authored loop and settings,
not a promise of stable triangle IDs. `solidifyGeometry` separately records
outer/inner/rim provenance and its own dependency contract. Build materials and
surface-mounted ports separately; `surfaceTransform`/`surfacePath` reuse the
same support without projection guesses.

Actual users: `cyber/torso-form.js` wraps scalloped rib covers, iliac arches,
split apron and shoulder cowls; `studies/surface-contour.js` is an unrelated
notched curved service hatch. The former is an opt-in `bodyStyle: articulated`
on `cyber-form-study`, compatible with `headStyle: illustrated`. Legacy scene
and pose defaults remain intact. Render with `node scripts/review-torso.mjs`.

## Apertures through a curved shell

```js
const sheet = surfaceContourGeometry(support, {
  outline: [[.02,.02],[.98,.02],[.98,.98],[.02,.98]],
  holes: [[[.3,.2],[.65,.2],[.65,.75],[.3,.75]]],
  rounding: .12, refinement: 2,
});
const bracket = solidifyGeometry(sheet, {
  thickness: .008, offset: -1, regionPrefix: 'bracket',
});
sheet.dispose();
```

These are missing triangles plus solidified aperture walls, not dark decals or
booleans against an already-built mesh. The exterior and holes share the existing
rounding policy, which can alter the occupied UV area. Area validation uses the
rounded domain. Existing calls without holes retain their previous buffers.

`userData.surfaceContour.holes` stores copies of the authored apertures, and
`boundaryLoops` is present for perforated sheets. `boundaryCount` counts initial
exterior **and** hole vertices before refinement, not boundary edges after it.
Changes to any loop reconstruct topology; rebind dependent UV charts, weights,
anchors and high/low correspondence as described above. This does not cut a hole
through another object behind the sheet.

The mechanical boot's orange carrier and heel buttress use these apertures;
`studies/apertured-bracket.js` exercises the same operation on a curved structural
bracket. `node scripts/review-feet.mjs` renders both with fixed before/after cameras.

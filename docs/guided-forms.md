# Guided forms: shared shape before detail

Active recipe: `models/cyber-form-study.js`, **Prism / guided form refinement**.
Baseline: `models/cyber-pose-study.js`. The guide, camera and reference annotations remain unchanged.
The image is a design reference, not a texture projection. These constructions do not import a human mesh or use an image-to-3D service. The linked tutorial demonstrations were not accessible and are not claimed as sources for particular operations.

## The construction vocabulary

A component now separates its defining curves, continuous support, boundaries, physical thickness, attachments, and optional high-only detail. Geometry resolution is chosen after primary construction rather than determining the shape.

```js
import {
  guideCurve, railSurface, shapeProfile, surfaceBand,
  thickenSurface, compileSurface,
} from '../src/lib/shape-rails.js';
import {
  partitionSurface, surfaceEdge, edgeDerivative, matchBoundary,
} from '../src/lib/surface-boundary.js';

// `guides` are a component's independently authored 3D guide curves.
const support = railSurface(guides.map(points => guideCurve(points)));
const band = surfaceBand(support, {
  left: shapeProfile([[0, 0.15], [0.5, 0.08], [1, 0.25]]),
  right: shapeProfile([[0, 0.8], [0.5, 0.95], [1, 0.75]]),
});
const shell = thickenSurface('Shell', band, {
  thickness: 0.003, segments: [24, 32], material: ceramic,
});
```

`guideCurve` describes spatial flow. `railSurface` interpolates across those curves. `shapeProfile` provides a shape-preserving cubic scalar profile without per-station flat spots. `surfaceBand` trims a support by two curve-defined boundaries. `surfaceLayer` in `surface-frame.js` offsets along the support's normal; the same support can place a port or seam through `attachToSurface`. These operations are useful for hair, shell panels, straps and layered components rather than being exclusive to this android.

The pictured armor is still simplified: the new tools do not determine an attractive contour automatically, solve intersections or generate joint-ready body topology.

### Profile a shell silhouette without editing vertices

`contouredShield()` now accepts longitudinal `widthProfile` and `centerProfile` curves. The first controls half-span through height; the second shifts the chart centerline as a fraction of the full authored width. Both drive the shared dark substrate and ceramic face, so changing a chest or shoulder outline does not duplicate coordinates between layers or depend on mesh resolution.

```js
const chestLeaf = contouredShield({
  width: 0.106, height: 0.118, bulge: 0.014,
  widthProfile: [[0, .28], [.40, .92], [.66, .78], [1, .24]],
  centerProfile: [[0, .10], [.45, .05], [1, .15]],
}, materials);
```

This is still a regular single-chart surface: it can taper and bias a plate, but it does not make arbitrary concave cutouts, booleans, collision-aware overlaps or automatically segmented armor. The torso pass uses these profiles to expose more of the black thoracic core while keeping the reference pose, named landmarks and camera unchanged.

## One support across material boundaries

The recovered hair had separate side and fringe patches. Their boundaries could drift, and merely making the visible outer silhouette larger left holes or creases elsewhere. The new upper hair uses one periodic support partitioned into two domains. The lower side section continues from that support using a boundary and inward derivative constraint.

```js
const { crown, fringe } = partitionSurface(sharedUpper, [
  { name: 'crown', end: 0.55 },
  { name: 'fringe', end: 1 },
]);
const lower = matchBoundary(lowerDraft, {
  edge: 'v0',
  curve: surfaceEdge(crown, 'v1'),
  inward: edgeDerivative(crown, 'v1', { scale: -1 }),
  width: 0.3,
});
```

The example derivative scale depends on the relative parameter lengths of the real component. A position constraint alone does not impose a smooth normal. `matchBoundary` applies a correction that vanishes smoothly outside its strip and can match a supplied transverse derivative. `boundaryGap` measures support-curve agreement independently of rendering.

These are **support constraints, not topology welding**. Render charts remain separately tessellated, so finite segment counts, different tangent frames and high-only relief need their own checks. Do not call the hair a closed manifold or a deformation-ready scalp. The crown and frontal groove still need visual refinement.

## Cache complex supports without confusing approximation with fidelity

Repeatedly evaluating nested curves and differential frames made normal baking too slow for short iteration calls. `cacheSurface` samples a primary support once, then evaluates a C1 bicubic field with periodic addressing or linear boundary ghost samples. It is shared by high, low and baked variants and does not cache illumination or reference pixels.

```js
import { cacheSurface, measureSurfaceCache } from '../src/lib/surface-cache.js';
const cached = cacheSurface(expensiveSupport, { segments: [192, 192] });
const error = measureSurfaceCache(expensiveSupport, cached, { samples: 2048 });
```

This is an **approximation of primary geometry**, not a lossless operation. The separate `compactGeometry` utility is lossless attribute indexing; those two guarantees must not be conflated. Independent, non-grid samples verify the cache's spatial error. A finer source, a sharper fold or a different surface can require a denser cache. Position error alone does not bound normals, silhouette error, animated shading or artistic quality.

## Closed volumes from contours

`contourVolume` in `src/lib/contour-volume.js` lofts a closed XZ footprint through height sections, including top and bottom caps and explicit UVs. It is used for the new rounded orange sole and dark midsole, replacing the flat, block-like sole. The boot upper, toe bumper and cuff remain separately authored shells.

```js
const sole = contourVolume({
  name: 'Sole', outline: footprint,
  sections: [
    { height: 0, scale: [0.92, 0.97] },
    { height: 0.006, scale: [1, 1] },
    { height: 0.02, scale: [0.94, 0.98] },
  ],
  material: rubber,
});
```

The cap fan assumes a simple, star-shaped footprint. This is not a polygon boolean, an arbitrary concave mesher or a self-intersection repair. Tests check geometric edge pairing, winding, positive volume, cap orientation, finite attributes and periodic UV-seam shading on the tested shapes. Separate objects can still intersect one another.

## Representation is separate from shape

`guidedBob({mode: 'sculpt' | 'cage' | 'baked'})` compiles the same support at different resolutions. Fine fibers are procedural surface relief and albedo, not strands extracted from the reference. `compileSurface` transfers the evaluated high surface normal into the actual low triangle's MikkTSpace frame. Low and baked positions, indices, normals, UVs and tangents are tested for equality.

The hair modes apply to the **hair component**, not a decimated or fully baked character. Normal maps cannot restore geometric silhouettes, cavities, occlusion or deformation. The chart-normal report retains mean, 95th percentile and maximum errors, and explicitly flags tails over five degrees rather than using a low average as acceptance.

## Repeatable local review

```sh
npm run render -- models/cyber-form-study.js \
  --params '{"hairMode":"baked"}' --views hero \
  --size 768x1376 --out renders/forms --glb

npm run render -- studies/prism-head.js \
  --params '{"hair":false}' --views front,side --passes clay \
  --out renders/head-construction

npm run render -- studies/prism-boot.js \
  --views front,side,threequarter --passes material,clay \
  --out renders/boot --glb

npm run review:forms
```

The review renders fixed-camera high/low/baked variants and a head pose, checks clean export isolation, captures side/back and exposed-head clay, measures the unchanged reference landmarks, renders a visible-hair mask with occluding geometry, measures support/cache quality, and exports separate hair modes. Its manifest is saved incrementally. The figure's observed feature locations and the annotated visible-hair mask are independent diagnostics; neither is a likeness score or held-out test.

The visible-hair annotation includes an approximate face opening and twelve-pixel uncertainty. It is retained unchanged. Outer convex-envelope overlap alone can look good while occlusion or the face opening is wrong; inspect the visible mask and the actual image as well.

The local renderer uses software WebGL and no Blender. Authored scene cameras and five lights export; bloom, fog and depth of field remain renderer-specific. This revision adds no native Blender verification, full humanoid skinning, dynamic hair simulation, or complete animation rig. Existing hand/arm validation does not apply to this different scene.

## Next useful work

Inspect the new primary shapes before adding small decoration. The remaining face is doll-like, the crown has an unwanted groove, armor still has broad simple panels, the toe bumper is too regular, and the luminous loop is opaque and too bright. Keep this pose and reference fixed while addressing one of these regions, with neutral and alternative views. Never change an annotation just to improve a metric.

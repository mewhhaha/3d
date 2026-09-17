# Topology-preserving sculpt edits on ordinary `BufferGeometry`

Use `src/lib/geometry-sculpt.js` when an authored component already exists as ordinary indexed Three.js `BufferGeometry` and a local primary-form change should preserve its topology. This is deliberately separate from `src/lib/forms/sculpt.js`, which edits the repository's shared-quad control cages before their later compilation stages.

```js
import {
  radialSelection, pathSelection, framedSelection, symmetrySelection,
  facingSelection, faceRegionSelection, intersectSelections,
  pullVertices, inflateVertices, smoothVertices, sculptGeometry,
} from '../src/lib/geometry-sculpt.js';

const oneSide = pathSelection({
  points: [[0.04, 0.10, 0], [0.09, 0.04, 0.01], [0.13, -0.06, -0.03]],
  radius: [0.03, 0.04, 0.05],
});
const facialRidges = intersectSelections(
  faceRegionSelection(head, 'creature.face'),
  framedSelection(symmetrySelection(oneSide, 'x'), {
    origin: [0, 0, 0.20],
    rotation: [0, 0, -8],
  }),
  facingSelection([0, 0, 1], { minDot: 0.08 }),
);
const edited = sculptGeometry(head,
  inflateVertices(facialRidges, 0.04),
  smoothVertices(facialRidges, { strength: 0.12, iterations: 1 }),
);
```

Selections are point-domain weights in **geometry-local meters**. `radialSelection()` provides scalar or XYZ ellipsoidal support with exact zero outside its radius. `pathSelection()` does the same around a reusable 3D polyline, with either one radius or a radius per authored path point; the nearest segment interpolates the endpoint radii. `facingSelection()` evaluates current vertex normals. `faceRegionSelection()` explicitly converts existing named face-domain semantics to point weights using incident-face ownership. `intersectSelections()`, `unionSelections()` and `invertSelection()` compose those sources without exposing triangle or vertex IDs to a recipe. `selectionWeights()` can materialize any composed selection as a deterministic `Float32Array` for inspection or reuse.

`framedSelection()` evaluates any child selection in an independently editable local frame. The frame uses geometry-local meter translation, XYZ rotations in degrees, and positive scale, matching the repository's authoring conventions. `symmetrySelection()` unions a selection with its reflection across a local X/Y/Z axis or an explicit symmetry plane. Nesting symmetry inside a frame makes the mirror plane part of that authored selection frame instead of tying it to scene coordinates.

`pullVertices()` applies one local vector; `inflateVertices()` follows the current vertex normal; `smoothVertices()` performs simultaneous one-ring averaging and pins open boundaries by default. `sculptGeometry()` evaluates operations sequentially, so later masks/normal-directed edits see the geometry produced by earlier operations. The input geometry is not mutated.

## Why paths instead of many radial dabs

A chain of radial masks can approximate a seam or fold, but every bend, width change, and later repositioning requires editing several unrelated centers. A path keeps that intent as one piece of construction data: edit the polyline, its point radii, or its local frame and the selection is regenerated. This is useful for creature folds, brows, ridges, hard-surface grooves, panel seams, and similar elongated edits.

`pathSelection()` measures ordinary 3D Euclidean distance to the authored polyline. It is not a screen-space brush or a geodesic-on-surface solver. For curved support where a path must stay on the exact surface, author or derive appropriate 3D path samples first, then use semantic/facing masks to constrain influence.

## Ownership contract

This operation is topology-preserving, not a remesher. The clone retains the source index and ordinary attributes such as UVs, colors and custom point fields. Named face-region metadata therefore remains valid. Normals and bounds are rebuilt after position changes; if a source tangent attribute exists, tangents are rebuilt from its indexed position/normal/UV data. Production tangent-space normal-map assets may still require the repository's MikkTSpace pipeline rather than relying on Three.js's generic tangent builder.

Skin attributes and morph targets are rejected. Moving rest positions without an explicit rig/morph refit can make technically preserved weights or deltas semantically wrong, so this bounded API refuses to imply that ownership. Apply it before rig/morph authoring, or introduce a separate operation that explicitly owns those dependent data.

## Choosing this path versus cage sculpt

Use `forms/sculpt.js` when the component is still a shared quad cage whose tags, corner UV charts, subdivision correspondence and later bake stages are part of the design. Use `geometry-sculpt.js` when the component is already an ordinary indexed triangle mesh and the desired edit is a local topology-preserving form change. Neither API does dynamic remeshing, booleans, collision prevention, automatic rig refitting or arbitrary topology repair.

The radial-mask regression fixture remains `models/geometry-sculpt-study.js`. `models/geometry-stroke-study.js` and `studies/geometry-stroke.json` exercise the path/frame/symmetry layer on two different subjects: one authored creature facial-ridge path is mirrored inside a local frame, while an unrelated hard-surface service panel uses a rotated local frame to route a recessed seam. Both keep the same source tessellation before and after the edit.

## Current limitations

The current path selector uses closest Euclidean distance to piecewise-linear 3D segments. There is no screen-space stroke capture, resampling by pressure/time, geodesic distance, surface projection, occlusion test, custom falloff curve, collision handling, or automatic path transport across topology changes. Smoothing is simple one-ring Laplacian averaging, so it is mesh-density dependent and can shrink volume. Pull/inflate can create self-intersections. These limitations are explicit reasons to keep this layer compact rather than presenting it as a general sculpt application.

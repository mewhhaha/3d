# Topology-preserving sculpt edits on ordinary `BufferGeometry`

Use `src/lib/geometry-sculpt.js` when an authored component already exists as ordinary indexed Three.js `BufferGeometry` and a local primary-form change should preserve its topology. This is deliberately separate from `src/lib/forms/sculpt.js`, which edits the repository's shared-quad control cages before their later compilation stages.

```js
import {
  radialSelection, pathSelection, framedSelection, symmetrySelection,
  facingSelection, faceRegionSelection, intersectSelections,
  pullVertices, inflateVertices, smoothVertices, relaxVertices, sculptGeometry,
} from '../src/lib/geometry-sculpt.js';
import { projectSurfacePath, surfacePathSelection } from '../src/lib/surface-stroke.js';

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

`pullVertices()` applies one local vector; `inflateVertices()` follows the current vertex normal; `smoothVertices()` performs simultaneous one-ring averaging and pins open boundaries by default. `relaxVertices()` is the shrink-resistant alternative for fairing noisy primary form: each iteration applies a positive uniform one-ring Laplacian pass followed by a slightly stronger negative pass (`lambda: 0.5`, `mu: -0.53` by default), following the bounded two-step pattern described by Taubin. It uses the same selection and boundary contract, but an iteration costs two mesh passes and it is not a volume guarantee. `sculptGeometry()` evaluates operations sequentially, so later masks/normal-directed edits see the geometry produced by earlier operations. The input geometry is not mutated.

## Project authored strokes onto a support and measure distance on the mesh

Use `projectSurfacePath()` when an authored polyline should be interpreted as a stroke near a specific support surface rather than as a free-space tube. It resamples the authored segments, projects each sample through the reusable triangle spatial index, and records triangle IDs plus barycentric coordinates so the projected path can follow later **same-topology** form edits. `surfacePathSelection()` then converts that projected path into point weights using shortest accumulated mesh-edge length instead of straight-line 3D distance.

```js
const projected = projectSurfacePath(panel, {
  points: [[-0.18, -0.08, 0.02], [0.12, 0.06, 0.02]],
  sampleSpacing: 0.02,
  maxDistance: 0.04,
  regionNames: 'part.front',
});
const seam = surfacePathSelection(panel, projected, {
  radius: 0.045,
  regionNames: 'part.front',
});
const edited = sculptGeometry(panel, pullVertices(seam, [0, 0, -0.02]));
```

Projection ownership and falloff propagation are intentionally separate. `regionNames` on projection prevents samples from binding to the wrong nearby layer; the same region constraint on `surfacePathSelection()` prevents shortest-path propagation from taking shortcuts through unrelated semantic areas. Disconnected layers receive no influence because the edge graph has no route between them. A connected layer that can only be reached by a long path around a fold also stays untouched when that path exceeds the brush radius.

The distance is an **edge-geodesic approximation**, not an exact continuous geodesic over triangle interiors. It uses Dijkstra-style shortest accumulated edge length with seed distances from projected samples to their owning triangle corners. This is deterministic and works directly on the ordinary indexed topology the sculpt stage already owns, but its smoothness depends on mesh density and triangulation.

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

The current path selector uses closest Euclidean distance to piecewise-linear 3D segments. There is no screen-space stroke capture, pressure/time sampling, continuous triangle-interior geodesic solve, occlusion test, custom falloff curve, collision handling, or automatic projected-path remap across topology-changing operations. `projectSurfacePath()`/`surfacePathSelection()` provide bounded projection plus edge-distance propagation for same-topology indexed supports. Both `smoothVertices()` and `relaxVertices()` use uniform one-ring neighborhoods, so their result is mesh-density/valence dependent; relaxation resists one-way shrinkage but is not an exact volume-preserving or curvature-flow solver. Pull/inflate/relax can still create self-intersections when pushed aggressively. These limitations are explicit reasons to keep this layer compact rather than presenting it as a general sculpt application.

# Topology-preserving sculpt edits on ordinary `BufferGeometry`

Use `src/lib/geometry-sculpt.js` when an authored component already exists as ordinary indexed Three.js `BufferGeometry` and a local primary-form change should preserve its topology. This is deliberately separate from `src/lib/forms/sculpt.js`, which edits the repository's shared-quad control cages before their later compilation stages.

```js
import {
  radialSelection, facingSelection, faceRegionSelection,
  intersectSelections, pullVertices, inflateVertices, smoothVertices,
  sculptGeometry,
} from '../src/lib/geometry-sculpt.js';

const forehead = faceRegionSelection(head, 'creature.forehead');
const crest = intersectSelections(
  forehead,
  radialSelection({ center: [0, 0.12, 0.17], radius: [0.15, 0.19, 0.13] }),
  facingSelection([0, 0, 1], { minDot: 0.08 }),
);

const edited = sculptGeometry(head,
  inflateVertices(crest, 0.06),
  pullVertices(crest, [0, 0.018, 0.018]),
  smoothVertices(crest, { strength: 0.17, iterations: 2 }),
);
```

Selections are point-domain weights in **geometry-local meters**. `radialSelection()` provides scalar or XYZ ellipsoidal support with exact zero outside its radius. `facingSelection()` evaluates current vertex normals. `faceRegionSelection()` explicitly converts existing named face-domain semantics to point weights using incident-face ownership. `intersectSelections()`, `unionSelections()` and `invertSelection()` compose those sources without exposing triangle or vertex IDs to a recipe. `selectionWeights()` can materialize any composed selection as a deterministic `Float32Array` for inspection or reuse.

`pullVertices()` applies one local vector; `inflateVertices()` follows the current vertex normal; `smoothVertices()` performs simultaneous one-ring averaging and pins open boundaries by default. `sculptGeometry()` evaluates operations sequentially, so later masks/normal-directed edits see the geometry produced by earlier operations. The input geometry is not mutated.

## Ownership contract

This operation is topology-preserving, not a remesher. The clone retains the source index and ordinary attributes such as UVs, colors and custom point fields. Named face-region metadata therefore remains valid. Normals and bounds are rebuilt after position changes; if a source tangent attribute exists, tangents are rebuilt from its indexed position/normal/UV data. Production tangent-space normal-map assets may still require the repository's MikkTSpace pipeline rather than relying on Three.js's generic tangent builder.

Skin attributes and morph targets are rejected. Moving rest positions without an explicit rig/morph refit can make technically preserved weights or deltas semantically wrong, so this bounded API refuses to imply that ownership. Apply it before rig/morph authoring, or introduce a separate operation that explicitly owns those dependent data.

## Choosing this path versus cage sculpt

Use `forms/sculpt.js` when the component is still a shared quad cage whose tags, corner UV charts, subdivision correspondence and later bake stages are part of the design. Use `geometry-sculpt.js` when the component is already an ordinary indexed triangle mesh and the desired edit is a local topology-preserving form change. Neither API does dynamic remeshing, booleans, collision prevention, automatic rig refitting or arbitrary topology repair.

The regression fixture is `models/geometry-sculpt-study.js`; `studies/geometry-sculpt.json` holds fixed cameras/lights for baseline/sculpted, organic-only and mechanical-only cases. The organic subject combines a named forehead region, ellipsoidal radial falloff and normal-facing selection. The mechanical subject uses a named service region plus nested radial fields to raise a ring and recess its center. Both demonstrate the same mask algebra without sharing proportions, topology intent or styling.

## Current limitations

The initial selectors are geometry-local radial, facing and named-region masks. There is no screen-space brush, polyline stroke, geodesic distance, occlusion test, pressure sampling or custom falloff curve yet. Smoothing is simple one-ring Laplacian averaging, so it is mesh-density dependent and can shrink volume. Pull/inflate can create self-intersections. These limitations are explicit reasons to keep this layer compact rather than presenting it as a general sculpt application.

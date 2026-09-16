# Workflow-first authoring principles

The repository is a reusable code-first 3D workshop. Individual references are integration and regression examples, not the architecture.

- Prefer a small construction operation that makes another character, creature, prop, sculpture or environment easier to author over a one-off coordinate patch.
- Exercise a new general abstraction on at least two materially different small examples when practical. One may be an existing reference component; the second should prove the abstraction is not reference-specific.
- Keep shape intent, local frames, representation resolution, materials, pose, reference annotations and rendering separable. Reference data belongs to the project using it, not generic geometry helpers.
- Research the concrete modeling problem using primary artist/developer sources when possible. Record what the source actually establishes, then implement or reject a bounded adaptation. Do not turn research into a documentation-only substitute for modeling work.
- Render the smallest relevant examples first and inspect material/clay/alternative views. Mechanical tests and GLB validation are necessary but do not establish visual quality.
- Preserve old recipes as regressions when evolving the vocabulary; avoid hiding giant coordinate tables behind wrappers with no independent users.

Current workflow research notes live under `docs/research/`. The cyber-android remains a demanding reference case, but future references should be able to use the same construction vocabulary without inheriting its camera, dimensions, annotations or styling.

## Keep sheet shape, shell thickness, and shading finish separate

Thin authored surfaces should not need thickness baked into their guide/profile data. `src/lib/surface-thickness.js` provides a bounded topology stage after a surface has been designed:

```js
import { solidifyGeometry, creaseNormals } from '../src/lib/surface-thickness.js';

const shell = solidifyGeometry(authoredSheet, {
  thickness: 0.012,
  offset: -1,
  rim: 'smooth',
});
const finished = creaseNormals(shell, { angle: 40 });
```

`solidifyGeometry()` owns new topology and makes that ownership explicit: supported UVs are rebuilt, unsupported topology-dependent attributes are reported as invalidated, and skin/morph/material-group dependencies are rejected rather than silently copied. It is a simple normal-offset shell, not an even-thickness/self-intersection solver. `creaseNormals()` is an optional downstream shading stage, not a substitute for beveling or physical edge construction. This separation lets the same source sheet become a leaf, hair/card strip, cloth trim or hard-surface panel without changing the source path/profile merely to change wall depth.

## Transfer continuous attributes after topology changes

Some useful construction stages deliberately create new topology: a solidified sheet, rebuilt trim, retessellated support, or additive boundary profile no longer has one-to-one source vertices. For continuous point-domain authoring data, use an explicit closest-surface projection instead of assuming vertex correspondence:

```js
import { transferSurfaceAttributes } from '../src/lib/attribute-transfer.js';

const coloredShell = transferSurfaceAttributes(source, shell, {
  attributes: ['color', 'mask'],
  maxDistance: 0.04,
});
```

`transferSurfaceAttributes()` clones the target, finds the closest point on the indexed source triangle surface, and barycentrically interpolates only the named non-normalized Float32 attributes. `maxDistance` is an authoring guard against accidental projection onto remote geometry. The first version is intentionally conservative: UVs, normals, tangents, skin data and other domain-specific/discrete semantics are rejected rather than silently treated as generic floats. It is also a brute-force search, so use it as a bounded construction/data-transfer stage rather than a per-frame deformation operation. Geometry construction, attribute transfer and export semantics remain separate responsibilities.

## Reuse spatial queries and constrain ambiguous transfers

Closest-surface construction is useful beyond attribute transfer, so its acceleration now lives in `src/lib/triangle-spatial-index.js`. Build the index once for an immutable indexed triangle source, then reuse nearest-point queries rather than rescanning every face for every target point:

```js
import { triangleSpatialIndex } from '../src/lib/triangle-spatial-index.js';

const query = triangleSpatialIndex(source, { leafSize: 8 });
const hit = query.closestPoint(point, {
  groupIndices: [0],
  normal: targetNormal,
  minNormalDot: 0.35,
});
```

The hierarchy uses median centroid splits and AABB distance pruning. It is deterministic against the brute-force baseline, including equal-distance tie breaking. `transferSurfaceAttributes()` accepts `acceleration: 'auto' | 'brute-force' | 'bvh'`; auto keeps tiny jobs simple and switches to the hierarchy when the source-triangle × target-vertex candidate count reaches 150,000.

Nearest geometry is not always the intended source. Optional `groupIndices` restrict transfer to explicit Three.js `BufferGeometry.groups`, and `minNormalDot` rejects source triangles whose geometric face normal disagrees with the target vertex normal. These are authored constraints, not automatic semantic correspondence: a group index is not a character-part ontology, and normal-facing cannot disambiguate two nearby same-facing layers. UV/corner data, skinning, discrete labels and semantic ownership still need separate transfer contracts.

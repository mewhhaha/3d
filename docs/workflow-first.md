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

## Name face-domain construction intent instead of material groups

Three.js `BufferGeometry.groups` are rendering partitions, not durable modeling identities. For correspondence, attachment and selection that should survive material regrouping, resolve author intent into named face-domain regions:

```js
import { defineFaceRegions, faceRegionVertexMask } from '../src/lib/face-regions.js';

const tagged = defineFaceRegions(source, {
  'shell.service-face': ({ centroid, normal }) => centroid.z > 0.02 && normal.z > 0.5,
});
const mask = faceRegionVertexMask(tagged, 'shell.service-face');
```

`defineFaceRegions()` evaluates predicates once and stores only JSON-safe names plus compressed triangle ranges in geometry metadata. Regions may overlap because they are construction semantics, not draw calls. `triangleSpatialIndex()` accepts `regionNames`, and `transferSurfaceAttributes()` accepts `sourceRegions`, so the same semantic name can drive a closest-surface attachment or a topology-transfer correspondence filter. Numeric `groupIndices` remain supported for cases where a material partition really is the intended constraint.

Regions are explicitly face-domain and topology-dependent. Cloning preserves them, but changing triangle count makes the metadata stale and access fails rather than silently retargeting old face IDs. `faceRegionVertexMask()` is an explicit face-to-point conversion for vertex editing/visualization; its fractional incident-face ownership is an authoring weight, not a discrete label transfer. Arbitrary remeshing/boolean operations still need an explicit region-transfer contract.

## Preserve face regions when a topology operation knows provenance

When a construction stage knows exactly which source faces generated each new target face, keep that provenance exact rather than discarding semantic regions and trying to reconstruct them later with nearest-surface projection:

```js
const shell = solidifyGeometry(taggedSheet, {
  thickness: 0.02,
  rim: 'smooth',
  regionPrefix: 'shell',
});
const serviceExterior = faceRegionTriangles(
  shell,
  ['panel.service', 'shell.outer'],
  { match: 'all' },
);
```

`remapFaceRegions()` accepts an explicit target-face → source-face relation and carries selected source face-region names onto the new topology. `solidifyGeometry()` now uses its own construction ordering to preserve source semantics across the outer copy, inner copy and generated boundary rim. An optional `regionPrefix` adds structural target-only roles such as `shell.outer`, `shell.inner` and `shell.rim`, which can be intersected with inherited semantic names for later attachments, masks, or correspondence queries. `preserveRegions: false` intentionally drops source semantics while still allowing those structural roles.

This is exact construction provenance, not universal semantic remeshing. It does not infer lineage through arbitrary booleans, remeshes or separately authored geometry, and it does not transfer edge-, point- or face-corner-domain semantics. For those unrelated-topology cases, use an explicit correspondence strategy such as the existing constrained closest-surface transfer instead of pretending the result is exact.

## Bind an exact surface spot when nearest should stop searching

Nearest-surface mounts are useful when the author means “find the closest admissible place again after this support changes.” They are the wrong semantic when the author means “this exact authored spot should move with the support.” Convert the former into a persistent barycentric anchor once the intended support location is established:

```js
import {
  surfaceMount, bindSurfaceAnchor, attachSurfaceAnchor,
} from '../src/lib/surface-mount.js';

const mount = surfaceMount({
  near: [0.08, 0.03, 0.12],
  regionNames: ['panel.service', 'panel.shell.outer'],
  regionMatch: 'all',
  offset: 0.01,
});
const anchor = bindSurfaceAnchor(bindPoseSupport, mount);
attachSurfaceAnchor(sensor, rebuiltSameTopologySupport, anchor);
```

`bindSurfaceAnchor()` stores one indexed face, its vertex triplet, barycentric point and an affine tangent direction. `resolveSurfaceAnchor()` / `attachSurfaceAnchor()` then rebuild the attachment frame from the current positions/normals of those same three vertices without running another nearest-surface query. Local component position/rotation/scale remain independently editable after the support frame, exactly as with `surfaceMount()`.

This is intentionally a **same-topology** contract. The current face's three vertex indices must still match the recorded triplet; an index reorder, remesh, boolean or unrelated reconstruction fails with an explicit rebind requirement instead of silently jumping. Use `surfaceMount()` when repeated geometric search is actually desired. A future topology constructor may provide an exact anchor-remap contract when it owns corner correspondence, but v1 does not infer that relation.

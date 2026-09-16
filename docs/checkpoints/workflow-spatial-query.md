# Triangle spatial-query workflow checkpoint

Base remote revision: `394e8841e7609ab3478122bad7cef0765b8ad328`.
Implementation revision: `d1f812eefbd60f0db28e7bcb369660426003638b`.
Capability: accelerate repeated closest-triangle queries with a reusable AABB hierarchy and add authored source-group / normal-facing constraints to otherwise ambiguous closest-surface transfer.

## Accepted change

- Added `triangleSpatialIndex()` in `src/lib/triangle-spatial-index.js`. It snapshots an indexed triangle source into a deterministic median-split AABB hierarchy and returns nearest position, distance, triangle/source-vertex indices, geometric face normal and barycentric coordinates.
- The hierarchy is a reusable geometry-query layer rather than attribute-transfer-only infrastructure. It exposes query and candidate-test diagnostics and must be rebuilt if source positions change.
- Extended `transferSurfaceAttributes()` with `acceleration: 'auto' | 'brute-force' | 'bvh'`. Tiny jobs retain the original brute-force path; auto selects the hierarchy when source-triangle × target-vertex candidate pairs reach 150,000.
- Added `groupIndices` to restrict source triangles to explicit Three.js `BufferGeometry.groups` and `minNormalDot` to reject source face normals that disagree with target vertex normals.
- Preserved the previous continuous Float32 point-domain contract, max-distance guard, source/target immutability and rejection of UV/normal/tangent/skin/discrete semantics.
- Equal-distance queries keep deterministic lower-triangle-index tie breaking. AABB nodes are pruned only when their distance lower bound is strictly greater than the best triangle distance, so tied candidates remain searchable.

## Two independent examples

`models/spatial-transfer-study.js` intentionally creates ambiguous nearby surfaces:

- **Organic layered sheet:** nearest-only transfer can jump to a nearby lower purple/blue surface. Constraining `groupIndices: [0]` keeps the transfer on the explicitly authored upper green/gold sheet.
- **Hard-surface service panel:** a closer backing sheet faces away from the target. `minNormalDot: 0.35` rejects it and keeps transfer on the intended cyan-to-orange front panel.

`studies/spatial-transfer.json` compares nearest-only and constrained modes under locked front, three-quarter and side cameras. Both cases have identical geometry, so the visible material change tests correspondence rather than remodeling.

## Local evidence

- `npm run doctor` — passed: Three.js **r186**, Chromium **144.0.7559.96**, WebGL2, SwiftShader.
- `node --test tests/triangle-spatial-index.test.js tests/attribute-transfer.test.js tests/surface-thickness.test.js tests/surface-boundary-profile.test.js tests/profile-sweep.test.js` — **24/24 passed**.
- `node --test --test-name-pattern='spatial-transfer-study|gallery has model recipes' tests/models.test.js` — **2/2 passed**.
- `npm run build` — passed with **23 recipes**.
- `npm run study -- studies/spatial-transfer.json renders/run15-spatial-transfer` — **passed**, 2 cases / 24 images. Both cases are **1,592 triangles**; locked-view silhouette IoU is **1.0** in front, three-quarter and side. GLB validation: **0 errors / 0 warnings** for both study cases.
- Isolated constrained renders: organic **560 triangles**, mechanical **1,032 triangles**. Independent GLB validation: **0 errors / 0 warnings** for both.
- A deterministic sphere test compares 40 BVH queries against brute force and requires the same triangle index, closest point and squared distance. The observed BVH triangle-test count is under 35% of exhaustive candidates.
- Larger transfer tests require byte-for-byte-equal Float32 transfer values between brute-force, explicit BVH and auto modes.
- A repository-wide `npm test` attempt reached test **81** with no failures before the bounded 180-second command timeout; it is **not** recorded as a full-suite pass.

## Local performance observation

Median of five post-warmup Node runs on this authoring environment; geometry/settings stayed fixed per row:

| source triangles | target vertices | exhaustive pairs | brute ms | BVH ms | BVH triangle tests |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 120 | 63 | 7,560 | 1.00 | 1.12 | 1,266 |
| 288 | 117 | 33,696 | 1.89 | 1.74 | 1,915 |
| 952 | 315 | 299,880 | 10.72 | 3.99 | 6,334 |
| 2,000 | 609 | 1,218,000 | 37.22 | 6.92 | 14,666 |
| 3,920 | 1,189 | 4,660,880 | 144.15 | 18.27 | 31,214 |

The smallest case is slightly slower through the hierarchy; this is why `auto` does not use BVH indiscriminately. The observed crossover is workload/environment dependent and is not a hardware-independent benchmark.

## Visual inspection

The nearest-only organic fixture visibly switches from the intended green/gold sheet to the nearby purple/blue layer across part of the card; the group-constrained result stays on the authored upper layer. The nearest-only mechanical panel samples the closer magenta backing surface; the normal-facing result restores the intended cyan-to-orange front field. Clay, wire and silhouette remain unchanged, confirming this pass changes correspondence rather than shape.

## Research

See `docs/research/spatial-query.md`. Blender's `BVHTree` API established reusable nearest-surface spatial queries as a distinct geometry service. CGAL's nearest-face documentation explicitly recommends constructing an AABB tree once for repeated closest-point queries. Three.js `Box3.distanceToPoint()` supplies the AABB lower bound used for pruning. The repository adaptation is intentionally smaller than those production systems and does not claim dynamic updates, overlap queries or ray casts.

## Limitations / next workflow target

The index snapshots source positions and must be rebuilt after deformation. Median centroid splits are simple, and there is no dynamic refit, ray casting, overlap query, semantic part graph, projection direction or same-facing multilayer disambiguation. `BufferGeometry.groups` are explicit source partitions but are not stable semantic identities by themselves. Normal-facing constraints require target vertex normals and cannot distinguish two nearby layers with similar normals.

The next general workflow priority is **authored correspondence domains**: reusable source-region predicates / stable semantic tags that survive construction and composition, so topology transfer and surface attachments can target named construction regions without depending on raw group indices.
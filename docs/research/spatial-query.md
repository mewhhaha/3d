# Triangle spatial-query notes

Accessed 2026-09-16. These notes record only what the cited public written sources establish and how that informed this repository's bounded adaptation.

## Blender BVHTree Utilities

- Source: Blender Foundation, **BVHTree Utilities (`mathutils.bvhtree`)** — https://docs.blender.org/api/main/mathutils.bvhtree.html
- Observation: Blender exposes a BVH built from polygon geometry and supports `find_nearest(origin, distance)` as a reusable proximity query, returning nearest position, normal, primitive index and distance. The same structure also serves overlap and ray-cast queries.
- Adaptation here: keep spatial indexing as a reusable geometry-query layer rather than burying it inside attribute transfer. `triangleSpatialIndex()` snapshots indexed triangles once and returns nearest point, face normal, triangle index, source vertex indices and barycentric coordinates.
- Test/example: deterministic nearest-point results are compared against the repository's brute-force triangle scan; layered organic and mechanical fixtures then consume the query through attribute transfer.
- Limitation: this implementation is not Blender's BVH implementation and does not claim its balancing strategy, dynamic updates, overlap API or ray casting.

## CGAL Polygon Mesh Processing / AABB tree

- Source: CGAL project, **Polygon Mesh Processing — Nearest Face Location Queries** — https://doc.cgal.org/latest/Polygon_mesh_processing/group__PMP__locate__grp.html
- Observation: CGAL recommends constructing an AABB tree once when more than one closest-point query will be performed, instead of rebuilding the structure for every point.
- Adaptation here: one `triangleSpatialIndex()` is built for the source surface and reused for all target vertices. Attribute-transfer diagnostics expose candidate-pair count, actual triangle tests and AABB node tests.
- Test/example: on this run's Node 22 / Three.js r186 environment, median timing over five post-warmup runs changed from roughly 10.72 ms brute force to 3.99 ms indexed at 952 source triangles × 315 target vertices, and from 144.15 ms to 18.27 ms at 3,920 × 1,189. The exact crossover is environment/workload dependent, so `auto` stays conservative.
- Limitation: CGAL's production AABB tree and secondary acceleration are substantially more sophisticated; these measurements do not transfer to CGAL or other hardware.

## Three.js Box3

- Source: Three.js project, **Box3** — https://threejs.org/docs/pages/Box3.html
- Observation: `Box3.distanceToPoint()` gives the Euclidean lower bound from a query point to an axis-aligned box (zero inside the box).
- Adaptation here: BVH traversal prunes a node only when that lower bound is strictly greater than the best triangle distance found so far. Equal-distance nodes remain searchable so deterministic lower-triangle-index tie breaking stays compatible with the brute-force baseline.
- Test/example: 40 deterministic random queries on an indexed sphere match the brute-force triangle index, closest position and squared distance while testing less than 35% of the brute-force triangle candidates.
- Limitation: `Box3` itself is not a BVH and provides no nearest-triangle semantics; tree construction, filtering, tie breaking and barycentric interpolation remain repository code.

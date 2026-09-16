# Persistent surface-anchor notes

Accessed 2026-09-16. This pass concerns persistent attachment to one authored spot while an existing support mesh changes shape without changing indexed topology.

## Blender Manual — Surface Deform Modifier

- URL: https://docs.blender.org/manual/en/4.2/modeling/modifiers/deform/surface_deform.html
- Author/publisher: Blender Foundation documentation; Blender 4.2 LTS manual.
- Observation: Surface Deform has an explicit **Bind** step. After binding, later changes to the target mesh deform the bound mesh; the manual distinguishes that stored bind from simply searching the target again every evaluation. It also warns that surface binding has validity/quality limits.
- Repository adaptation: keep nearest-surface `surfaceMount()` as search-based authoring intent, but add `bindSurfaceAnchor()` as an explicit one-time conversion into stored same-topology correspondence. Resolving the anchor does not run another closest-point query.
- Test/example: bind a bud to an open leaf and a sensor to a flat panel, rebuild each support with the same indices but strongly changed positions, then compare the persistent anchor with a fresh nearest-surface mount.
- Result: the anchor remains on the recorded face/barycentric spot while the nearest query selects another admissible triangle in both fixtures.
- Limitation: this is not Blender Surface Deform. It binds one rigid component frame to one triangle, not every vertex of a deforming mesh to a multi-face cage and not a dependency-graph modifier.

## Three.js r186 — `Triangle`

- URL: https://threejs.org/docs/pages/Triangle.html
- Author/publisher: Three.js project; documentation currently reports r186.
- Observation: `Triangle.getBarycoord()` computes barycentric coordinates for a point and the class exposes barycentric interpolation helpers. These coordinates are a natural compact representation of a point relative to one triangle.
- Repository adaptation: store `{ triangleIndex, indices, barycoord }` in JSON-safe anchor data, then reconstruct the point from the current positions of those same three indexed vertices. The recorded vertex triplet is also a topology guard: if the face has been reordered or replaced, resolution fails and requires explicit rebinding rather than guessing.
- Test/example: unit tests compare resolved anchor position with manual barycentric interpolation after moving support vertices and reject an index reorder with unchanged triangle count.
- Result: same-topology edits are deterministic and exact for the recorded triangle.
- Limitation: barycentric coordinates do not identify the corresponding face after remeshing, booleans, decimation, or arbitrary index reordering. Those operations need an explicit constructor-known remap or a deliberate rebind.

## Frame adaptation

Barycentric position alone does not preserve authorial roll. At bind time the resolved tangent is expressed as affine weights over the bound triangle's three vertices; those weights sum to zero. On a same-topology rebuild the weighted vertex combination gives a direction that follows affine deformation of that triangle, after which it is projected against the selected face/smooth normal. This is a repository adaptation, not a documented Blender or Three.js feature. It keeps the component-local edit transform separate from support correspondence.

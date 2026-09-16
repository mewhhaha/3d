# Surface thickness and crease finish research

Accessed 2026-09-16. This note records only the written material that influenced the implementation; it does not claim access to any blocked video lesson.

## Blender 4.5 LTS — Solidify Modifier

Source: https://docs.blender.org/manual/en/4.5/modeling/modifiers/generate/solidify.html

Observed method: Solidify treats thickness as a separate operation on an existing surface. Its simple mode extrudes a shell, exposes an offset from -1 to +1 for locating the authored surface inside/outside the result, can fill open boundaries with a rim, and explicitly warns that wall thickness is an approximation rather than a guaranteed exact offset. Complex topology, self-intersection control, material offsets and advanced boundary handling are separate features.

Adaptation: `solidifyGeometry()` is deliberately a small simple-mode analogue for ordinary indexed triangle surfaces. It offsets copies along source vertex normals, supports scalar or per-vertex thickness, uses the same -1..1 placement vocabulary, and can leave boundaries open or build sharp/smooth rims. It rejects ambiguous dependencies rather than pretending to preserve them. It does **not** implement Blender's complex mode, even-thickness correction, clamp, material slots, non-manifold repair or self-intersection handling.

Test/example: a swept organic ribbon and an independently deformed mechanical panel both use the same operator. Tests cover centered/inside/outside placement, variable thickness, sharp/smooth rims, topology rejection and source immutability.

## Blender 4.5 LTS — Smooth by Angle

Source: https://docs.blender.org/manual/en/4.5/modeling/modifiers/normals/smooth_by_angle.html

Observed method: edge sharpness is derived from the angle between neighboring face normals, and that shading decision is separable from the underlying modeling operation.

Adaptation: shell construction and shading finish remain separate. `creaseNormals()` is applied *after* topology-changing thickness when an author wants angle-controlled hard/smooth transitions. This is not a bevel, crease-weight system or subdivision rule.

Test/example: the mechanical panel solidifies with a sharp boundary, then receives a 34-degree crease-normal finish without changing its authored source panel.

## Three.js r186 — BufferGeometry and BufferGeometryUtils

Sources:
- https://threejs.org/docs/pages/BufferGeometry.html
- https://threejs.org/docs/pages/module-BufferGeometryUtils.html

Observed API facts: indexed `BufferGeometry` shares vertices between triangles; `computeVertexNormals()` averages face normals at shared indexed vertices; tangents require position/normal/UV and normal-map portability should prefer MikkTSpace. `BufferGeometryUtils.toCreasedNormals()` provides an angle-based normal split and de-indexes indexed geometry.

Adaptation: `solidifyGeometry()` operates on indexed triangles so it can recover directed manifold boundary loops. It emits fresh positions/indices/normals, preserves the source UV chart on the two shell copies, writes explicit rim UVs when UVs exist, and records tangent/custom-attribute invalidation because topology changed. `creaseNormals()` explicitly deletes stale tangents and records that it may de-index topology. Skin weights, morph targets and material groups are currently rejected by solidification rather than silently corrupted.

Result: the focused surface/profile/frame test set passed locally and all three study GLBs validated with zero errors and zero warnings. Visual review confirmed actual side-wall thickness on the organic fixture and a distinct sharp shell rim on the mechanical fixture.

## Current limitations

This is a normal-offset shell, not an exact signed-distance surface. Tight concavities and sharp corners can self-intersect or vary in physical wall thickness. The source normals therefore materially affect the result. V1 requires indexed triangle geometry, a full draw range and consistently wound manifold boundaries; it does not transfer material groups, skin weights, morph targets, arbitrary custom attributes, tangents or high/low correspondence. Closed source meshes produce two disconnected closed shells unless the caller has a different construction intent. The crease stage changes vertex ownership and is intentionally downstream of topology construction.

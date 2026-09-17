# Research notes — composable masks for topology-preserving geometry sculpt

Accessed: 2026-09-17. Scope: a compact local-space mask/brush layer for ordinary indexed Three.js `BufferGeometry`. This is not an attempt to reproduce Blender Sculpt Mode.

## Blender 4.5 LTS — Visibility, Masking & Face Sets

Source: https://docs.blender.org/manual/en/4.5/sculpt_paint/sculpting/introduction/visibility_masking_face_sets.html

Observation: Blender distinguishes continuous per-vertex masks from face sets, while both can constrain what sculpt operations affect. Face sets are useful for isolating meaningful surface regions and can feed later masking workflows.

Repository adaptation: keep the existing named face-domain construction semantics in `face-regions.js`, convert them explicitly to point weights with `faceRegionSelection()`, and let those weights compose with spatial/orientation selectors. Do not overload render groups or turn a face label into a hidden vertex-index convention.

Test/example: the hard-surface fixture selects `panel.service` and intersects that ownership with radial falloff before raising a boss and recessing its center. The organic fixture intersects `creature.forehead` with radial and normal-facing selectors.

Result: one selection vocabulary works across semantically tagged organic and mechanical meshes while leaving face-region topology metadata intact.

Limitation: the face-to-point conversion is incident-face ownership, so shared boundary vertices receive fractional weights. It is not a discrete face-set editing mode.

## Blender sculpt brush falloff

Source: https://docs.blender.org/manual/en/4.5/sculpt_paint/brush/falloff.html

Observation: brush influence is a function of distance from the brush center to its boundary, with softer/harder falloff curves; normal/front-facing falloff is a separate way to suppress influence as the surface turns away.

Repository adaptation: `radialSelection()` uses an explicit geometry-local center plus scalar or XYZ radius and exact compact support; `facingSelection()` is a separate dot-product selector. `intersectSelections()` multiplies them instead of baking view-facing behavior into the radial brush. The initial falloff set is deliberately small (`smooth`, `linear`, `constant`).

Test/example: a sphere edit uses named forehead ownership × ellipsoidal radial falloff × +Z facing, while a panel ring uses nested radial fields with inversion.

Result: mask intent is independent of tessellation IDs and can be reused by pull, inflate, or smooth operations.

Limitation: there is no screen-space/projected brush, pressure/stroke sampling, custom curve editor, geodesic falloff, or occlusion test.

## Blender Smooth / Smooth Vertices

Sources:
- https://docs.blender.org/manual/en/5.2/sculpt_paint/sculpting/brushes/smooth.html
- https://docs.blender.org/manual/en/5.3/modeling/meshes/editing/vertex/smooth_vertices.html

Observation: smoothing changes vertex positions, is controlled by strength, and may be repeated; Blender also distinguishes position smoothing from merely changing shading normals.

Repository adaptation: `smoothVertices()` performs bounded simultaneous one-ring neighbor averaging with strength/iterations and pins open-boundary vertices by default. This is intentionally simpler than Blender's sculpt smoothing implementations, but preserves the same important authoring separation: geometry smoothing modifies positions, while `computeVertexNormals()` is a downstream shading rebuild.

Test/example: a displaced grid center relaxes while every open boundary vertex remains bit-for-bit fixed in the dedicated unit test.

Result: smoothing can be composed after pull/inflate without changing topology.

Limitation: basic Laplacian averaging can shrink volume and is mesh-density dependent. There is no cotangent weighting, Taubin compensation, collision handling, or detail-preserving mode.

## Three.js `BufferGeometry`

Source: https://threejs.org/docs/pages/BufferGeometry.html

Observation: `clone()` copies geometry values; after editing positions, bounding volumes may need recomputation. `computeVertexNormals()` rebuilds shared indexed vertex normals. `computeTangents()` requires indexed position/normal/UV data.

Repository adaptation: `sculptGeometry()` always clones the source, preserves the index and ordinary attributes, recomputes normals and bounds, and recomputes tangents only when the source already owned tangents. Skin attributes and morph targets are rejected because this bounded pre-rig operation does not own the corresponding rig/morph refit.

Test/example: an indexed UV panel with a custom scalar attribute and tangents keeps identical index/UV/custom arrays after sculpt while normals/tangents remain finite; source positions remain unchanged.

Result: topology-preserving form edits fit the repository's ordinary Three.js/export path without a new dependency.

Limitation: changing rest positions can require application-specific rebinding even when skin weights technically remain point-domain data, so v1 intentionally refuses skinned geometry rather than implying rig safety.

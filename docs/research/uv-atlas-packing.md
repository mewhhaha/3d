# Research note — UV atlas inspection and packing

Accessed: 2026-09-17. Scope: diagnostics and deterministic placement for semantic charts that already have UV coordinates. This note does not claim a new unwrap algorithm.

## Blender Foundation — Pack Islands

Source: https://docs.blender.org/manual/en/5.0/modeling/meshes/editing/uv.html

Observed: Blender's Pack Islands operation adjusts existing islands to use texture space efficiently while maintaining an explicit margin; it can translate, scale and rotate islands. The manual distinguishes fast bounding-box packing from more expensive convex/exact-shape methods, and distinguishes additive/fractional margin policies. Newer documentation also exposes packing into a custom UV region.

Repository adaptation: keep the first implementation deliberately bounded and deterministic. Pack each already-authored semantic chart by its declared rectangle, allow optional 90-degree rotation, accept an explicit target rectangle and UV-space margin, and never claim exact-shape packing. Preserve-vs-equalize texel density is an explicit option rather than a hidden side effect.

Test/example: `uv-atlas-study` starts with overlapping rectangles on both a curved creature shell and a mechanical housing, then packs each subject's two charts. Dedicated unit tests also exercise a custom target rectangle and deterministic repeated output.

Result: both study subjects move from one diagnosed cross-chart overlap pair to zero while keeping identical 3D topology and silhouette. The implementation remains a rectangle shelf pack and therefore may leave more unused texture space than a polygon-aware production packer.

## Blender Foundation — UV Stretch overlay

Source: https://docs.blender.org/manual/en/4.5/editors/uv/overlays.html

Observed: Blender's UV editor visualizes distortion by comparing UV space with the original 3D mesh and offers separate angle- and area-based stretch views. This establishes that atlas placement and mapping distortion are different diagnostics.

Repository adaptation: `inspectUvCharts()` reports angular error between each 3D triangle and its UV triangle, plus an area-stretch ratio normalized to that chart's mean texel density. The normalization prevents an author's deliberate atlas scale from being mislabeled as distortion. Degenerate UV triangles are reported separately instead of converted into a finite favorable score.

Test/example: the organic spherical fixture deliberately exhibits more angular/area distortion than the planar mechanical service chart; packing leaves those chart-internal distortion values unchanged while moving/scaling islands.

Result: the packed organic charts retain maximum angular errors of about 14.3° and 26.3° and maximum normalized area-stretch ratios about 1.20 and 1.29. Mechanical charts are near area-uniform while one rotated projection still has noticeable angular error. Packing is therefore not reported as an unwrap-quality improvement.

## Three.js — BufferAttribute / BufferGeometry

Sources: https://threejs.org/docs/pages/BufferAttribute.html and https://threejs.org/docs/pages/BufferGeometry.html

Observed: Three.js stores UVs as per-vertex buffer attributes, while indexed `BufferGeometry` reuses vertex indices across triangles. A `BufferAttribute` array contains `itemSize * vertexCount` values; indexed geometry's triangles reference those shared vertices.

Repository adaptation: the preceding chart projector already duplicates vertices for face-corner UV discontinuities. This pass strengthens that ownership rule by including chart identity in the seam cache key, so two distinct semantic islands never share one target UV vertex merely because their current coordinates coincide. The packer can therefore edit one island's UV attribute values without changing neighboring charts or unassigned source faces.

Test/example: unit tests verify source geometry remains untouched, repeated packing yields identical UV arrays, 3D face-corner positions remain exact, and persistent surface anchors remain valid after the UV-only packing stage.

Limitations: this does not make arbitrary corner-domain data automatically safe. Morph targets and interleaved attributes remain explicitly rejected by the topology-changing projection stage; a future topology operator still needs its own dependency-transfer contract.

# Semantic face regions and material slots

Accessed: 2026-09-17

## Blender Foundation — Material Assignment, Blender 4.5 LTS

- URL: https://docs.blender.org/manual/en/4.5/render/materials/assignment.html
- Publisher/author: Blender Foundation documentation contributors; accessed 2026-09-17.
- Actual observation: one object may have multiple material slots corresponding to different parts, and Edit Mode assigns the active material slot to selected faces. The manual separately recommends shader mixing when a smooth transition is desired.
- Intended repository operation: reuse already-authored named face regions as the discrete selection layer for material-slot assignment, while keeping semantic face ownership independent from rendering groups.
- Test/example: `tests/material-regions.test.js` maps named panel regions to slots and rejects conflicting overlaps; `models/material-regions-study.js` shows the same operation on organic and mechanical subjects.
- Result: the implementation preserves indexed topology and persistent anchors while emitting complete Three.js groups; the controlled study keeps baseline/assigned silhouette IoU at 1.0 in all locked views.
- Limitation/adaptation: this is a build-time geometry/material ownership helper, not Blender material data-block compatibility or smooth shader mixing.

## Three.js project — BufferGeometry groups

- URL: https://threejs.org/docs/pages/BufferGeometry.html
- Publisher/author: Three.js project documentation; publication date not stated; accessed 2026-09-17. Project dependency is locked to Three.js r186.
- Actual observation: `BufferGeometry.groups` split a geometry into separate draw calls so a Mesh can use an array of materials; `addGroup(start, count, materialIndex)` addresses index ranges for indexed geometry.
- Intended repository operation: compile semantic face selections into deterministic contiguous index-range groups without reordering faces or replacing geometry.
- Test/example: `faceMaterialIndices()` validates complete/non-overlapping triangle-aligned source groups, and `assignFaceMaterials()` regenerates complete runs after overrides.
- Result: material assignment changes only draw-group metadata; source indices/positions remain byte-identical in focused tests and baseline/assigned fixtures have identical triangle counts.
- Limitation/adaptation: material groups are rendering ownership, not semantic regions. The repository therefore does not overload group numbers as persistent authoring identifiers.

## Blender Foundation — UV Seams, Blender 4.5 LTS

- URL: https://docs.blender.org/manual/en/4.5/modeling/meshes/uv/unwrapping/seams.html
- Publisher/author: Blender Foundation documentation contributors; accessed 2026-09-17.
- Actual observation: seams partition surfaces into UV islands and different areas may use different unwrap strategies; seam placement is an iterative authoring decision.
- Intended repository operation: evidence-based rejection for this bounded pass. Do not pretend face-material groups solve UV chart authoring; chart boundaries need a separate explicit representation and may require topology duplication for face-corner UV discontinuities.
- Test/example: no UV topology rewrite was added in this pass. Existing UVs are preserved unchanged by material assignment.
- Result: the bounded implementation solves a repeated material-selection problem without prematurely coupling it to a more invasive UV seam/unwrap system.
- Limitation/adaptation: the next UV/chart stage still needs explicit seam/island provenance, packing and dependent-data transfer rules.

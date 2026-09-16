# Surface boundary profiles — research notes

Accessed 2026-09-16. Only public written documentation was used.

## Blender Manual — Bevel Modifier

Source: https://docs.blender.org/manual/en/5.2/modeling/modifiers/generate/bevel.html

Observed: bevel construction separates width, segment count, edge selection, overlap limiting, and corner/intersection behavior. Adaptation: this repository does not claim a general bevel solver. The new helper only derives local frames from consistently wound open surface boundaries and builds independent profile geometry along them.

## Blender Manual — Mesh Bevel Node

Source: https://docs.blender.org/manual/en/5.3/modeling/geometry_nodes/mesh/operations/mesh_bevel.html

Observed: selected edges and the editable two-dimensional Profile are separate controls. Adaptation: `surfaceBoundaryLoops()` owns ordered boundary data, while `boundaryProfileGeometry()` accepts independent 2D profile coordinates. `roundBoundaryProfile()` is only a preset.

## Three.js r186 — BufferGeometryUtils

Source: https://threejs.org/docs/pages/module-BufferGeometryUtils.html

Observed: `toCreasedNormals()` changes normal/shading ownership and can de-index geometry; it is not a physical edge construction operation. Adaptation: boundary profiles create real indexed geometry and UVs, while shading remains a separate downstream decision.

## Repository experiment

`boundary-profile-study` uses the helper on an open guide-swept organic crest and an independently deformed mechanical panel. The first uses a rounded elliptical profile; the second uses a rectangular offset perimeter profile. A unit fixture with a hole verifies opposite boundary winding and local outward directions.

Limitations: this is additive boundary trim, not source-face insetting, arbitrary manifold-edge beveling, corner solving, overlap prevention, collision handling, or source-attribute transfer. Coarse/noisy source boundaries remain coarse/noisy in the generated trim.

# Research note — face-region provenance through topology changes

Accessed 2026-09-16. This note records only written documentation read for this pass.

## Blender 4.5 LTS Manual — Extrude Mesh Node

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/mesh/operations/extrude_mesh.html

Observation: the node exposes separate **Top** and **Side** boolean outputs for generated topology. Its documented attribute-propagation rules retain the attribute domain, copy new face values from the corresponding source/extruded faces where that correspondence is known, and describe separate rules for newly generated connecting elements.

Adaptation here: topology-changing helpers that know their own construction correspondence should expose it instead of forcing a later nearest-surface guess. `remapFaceRegions()` accepts an explicit target-face -> source-face relation. `solidifyGeometry()` uses its exact construction order to carry source face-region names to outer, inner and boundary-rim faces, and an optional `regionPrefix` adds queryable derived roles such as `shell.outer`, `shell.inner` and `shell.rim`. Our solidify operation is not Blender's Extrude Mesh node: it retains two offset surface copies and closes open boundaries, so its exact propagation policy is documented and tested separately.

## Blender 4.5 LTS Manual — Attributes

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/attributes_reference.html

Observation: attribute domain is part of an attribute's meaning. Blender documents automatic interpolation during geometry changes, but also notes that anonymous attributes cannot simply be applied to completely unrelated geometry from a separate source.

Adaptation here: named construction regions remain face-domain data. This pass does not reproject them geometrically after a known topology operation; it maps them from explicit face provenance. Arbitrary remeshing, booleans or separately authored target meshes still need a different correspondence contract (for example the existing closest-surface transfer path). This avoids conflating exact construction provenance with proximity heuristics.

## Result and limits

The accepted implementation preserves source semantic regions through `solidifyGeometry()` and optionally adds structural shell-role regions. The generic remapper supports one or multiple source-face parents per target face, but v1 uses an `any parent belongs to the region` rule and does not store a persistent lineage graph. It does not transfer edge/corner/point-domain semantics, resolve region names after arbitrary remeshing, or export region metadata as glTF semantics.

# Research note — named face-domain construction regions

Accessed 2026-09-16. This note records only written material actually read for the named-region pass.

## Blender 4.5 LTS Manual — Attributes

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/attributes_reference.html

Observation: Blender treats an attribute's domain as part of its meaning. Face-domain values belong to faces, point-domain values belong to vertices, and face-corner data such as UVs have separate ownership. Domain conversion is explicit; Boolean face-to-point conversion selects a point when any connected face is selected.

Adaptation here: construction regions are stored as explicit **face-domain** metadata. `faceRegionVertexMask()` is a separate conversion to point-domain weights, rather than pretending face labels are ordinary vertex attributes. The returned weight is the fraction of incident faces in the region; that continuous boundary weight is our authoring choice, not Blender's Boolean conversion rule.

## Blender 4.5 LTS Manual — Visibility, Masking & Face Sets

Source: https://docs.blender.org/manual/en/4.5/sculpt_paint/sculpting/introduction/visibility_masking_face_sets.html

Observation: face sets group mesh faces and are reused for visibility and fast mask creation. The manual notes that Blender stores them as the `sculpt_face_set` attribute.

Adaptation here: one resolved named face region can be consumed by both spatial correspondence and point-mask creation. This is deliberately a small construction vocabulary, not a clone of Blender Sculpt Face Sets: there is no interactive paint, grow/shrink, visibility state or topology remeshing.

## Three.js r186 — BufferGeometry

Source: https://threejs.org/docs/pages/BufferGeometry.html

Observation: `BufferGeometry.groups` are draw-call/material partitions. The documentation requires every vertex/index to belong to exactly one group without overlap. `userData` is the supported place for custom geometry metadata, with the caveat that functions are not cloned there.

Adaptation here: semantic construction regions are **not** encoded as groups because useful authoring regions may overlap and should not change merely when material batching changes. Region predicates are evaluated once; only JSON-safe names and compressed triangle ranges are stored in `geometry.userData`. `BufferGeometry.clone()` therefore retains resolved region metadata without retaining predicate functions.

## Result and limits

The implementation lets `triangleSpatialIndex()` and `transferSurfaceAttributes()` target stable names such as `leaf.outer` or `housing.service-face` while preserving the older numeric group/facing filters. Tests require region-tagged geometry to survive cloning and reject stale metadata after triangle-count changes. This does not yet transfer named regions through arbitrary topology changes, preserve them through geometry merging automatically, or export them as glTF semantics.

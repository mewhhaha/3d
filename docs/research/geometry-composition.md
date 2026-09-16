# Geometry composition research notes

Accessed 2026-09-16. These notes record only written material used to choose the operation and its contract.

## Blender Manual — Join Geometry Node

- URL: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/geometry/join_geometry.html
- Author: Blender Foundation documentation contributors. Version: Blender 4.5 LTS.
- Observation: Join Geometry combines separately generated geometries; material slots are combined; named attributes are propagated using domain/type rules.
- Adaptation here: `composeGeometries()` likewise treats composition as a construction stage rather than scene-parenting, but v1 is intentionally stricter: all point attributes must have identical schemas instead of implicit conversion. Construction identity is stored as named face regions, not material groups.
- Test/example: the organic three-leaf cluster and mechanical panel+rail module each merge independently authored geometries while keeping source semantics and generated `part.*` regions.
- Limitation: this repository does not implement Blender's multi-domain attribute conversion, instance realization, material-slot management, or volume/component joining.

## Three.js — BufferGeometry

- URL: https://threejs.org/docs/pages/BufferGeometry.html
- Author: Three.js contributors. Dependency checked against repository Three.js r186.
- Observation: indexed geometry uses an explicit index buffer, while `groups` split drawing into separate material draw calls and are required to be non-overlapping/complete.
- Adaptation here: face ownership is deliberately independent of `groups`; source groups are copied only as rendering data, while `part.<name>` and inherited semantic regions remain overlapping modeling metadata. Indices and point attributes are copied into freshly owned buffers.
- Test/example: a regression changes source material group numbers while requiring identical `part.panel` semantic faces.
- Limitation: composition currently handles indexed triangle meshes only and rejects interleaved attributes, skinning, morph targets, and tangents.

## Three.js — BufferGeometryUtils.mergeGeometries

- URL: https://threejs.org/docs/pages/module-BufferGeometryUtils.html
- Author: Three.js contributors. Dependency checked against repository Three.js r186.
- Observation: `mergeGeometries()` requires compatible geometry attributes; `mergeAttributes()` likewise requires compatible attribute properties/types.
- Adaptation here: v1 uses the same conservative compatibility idea but owns its merge implementation so exact source-part provenance and named face-region offsets can be retained. Position/normal transforms are applied during composition; arbitrary point attributes are copied unchanged.
- Test/example: incompatible UV schemas fail rather than disappearing silently, and output buffers are verified independent from inputs.
- Limitation: no implicit type promotion or missing-attribute fill is attempted.

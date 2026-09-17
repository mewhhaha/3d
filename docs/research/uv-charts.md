# Research notes — semantic UV chart projection

Accessed 2026-09-17.

## Blender Foundation — Seams, Blender 5.2 LTS Manual

- URL: https://docs.blender.org/manual/en/5.2/modeling/meshes/uv/unwrapping/seams.html
- Observation: Blender describes a UV seam as a deliberate cut where the UV map becomes discontinuous, and recommends using enough seams to control stretching without creating unnecessary texturing boundaries.
- Intended operation: treat a named face-region boundary as an explicit chart boundary rather than mutating UVs on still-shared indexed vertices.
- Test/example: `uv-charts.test.js` verifies the selected chart duplicates shared seam vertices while preserving face order and 3D face-corner positions.
- Result: controlled UV discontinuities are explicit topology changes with source-vertex/corner provenance.
- Limitation: this API does not infer good seam placement or optimize stretch.

## Blender Foundation — UV Unwrap Node, Blender 5.2 LTS Manual

- URL: https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/mesh/uv/uv_unwrap.html
- Observation: the node consumes selected faces plus seam edges and outputs UVs on the face-corner domain; Blender distinguishes that corner-domain result from ordinary point data.
- Intended operation: keep named face selection separate from UV projection, and represent Three.js's missing face-corner discontinuity by deterministic vertex duplication only where corner UV ownership differs.
- Test/example: full chart coverage can author UVs on a source with no UV attribute; partial coverage without source UVs fails explicitly.
- Result: face semantics remain reusable while the derived render topology gains only the splits needed by its UV values.
- Limitation: this is not Blender's Angle Based/LSCM unwrap or automatic pack step.

## Blender Foundation — Project from View, Blender 4.5 LTS Manual

- URL: https://docs.blender.org/manual/4.5/modeling/meshes/editing/uv.html
- Observation: Project from View is an explicit projection onto a chosen plane/view and can stretch surfaces that recede from that direction.
- Intended operation: expose an explicit geometry-local `uAxis`/`vAxis` frame and atlas rectangle, making projection intent serializable and independent from the render camera.
- Test/example: the organic curved face patch and hard-surface service panel use different local projection frames.
- Result: local decals/checkers become expressible without recipe-specific UV coordinate loops.
- Limitation: planar projection can distort curved or oblique surfaces; no claim of distortion minimization is made.

## Three.js — BufferGeometry / BufferAttribute documentation

- URLs: https://threejs.org/docs/pages/BufferGeometry.html and https://threejs.org/docs/pages/BufferAttribute.html
- Observation: indexed triangles reuse vertex indices, while position, normal, UV and custom `BufferAttribute`s are parallel per-vertex arrays.
- Intended operation: when one source vertex needs different face-corner UVs, produce multiple output vertices that copy its ordinary attributes and point the relevant triangle corners at the correct duplicate.
- Test/example: a custom `authorTag` attribute is transferred to every duplicate; persistent surface anchors require the explicit remap helper because the index topology signature changes.
- Result: the API follows the locked Three.js r186 data model rather than pretending an indexed vertex can hold multiple UV values.
- Limitation: interleaved attributes and morph targets are rejected in v1; runtime docs are a data-model constraint, not an unwrap algorithm.

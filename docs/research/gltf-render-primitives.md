# Research notes — glTF render primitives and multi-material round trips

Accessed 2026-09-17.

## Khronos Group — glTF 2.0 Specification, Mesh / Mesh Primitive

- URL: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- Observation: a glTF mesh is a set of one or more primitives, and each primitive can independently reference a material. The interoperable unit that maps geometry to one material is therefore the primitive, not an application-specific logical mesh object.
- Intended operation: validate GLB export/import by preserved render-primitive count, triangle count and bounds instead of assuming an authored Three.js `Mesh` with several material groups reloads as one `Mesh`.
- Test/example: `render-primitives.test.js` exports one semantic multi-material surface and reloads it with locked Three.js r186. The source is one logical mesh with multiple material groups; the loader expands it to multiple `Mesh` objects while preserving the primitive count.
- Result: the local bake loop can distinguish a representational hierarchy change from lost geometry/material partitions.
- Limitation: primitive-count equivalence does not prove semantic object naming, material parameter equality, skinning or animation correctness; those remain separate checks.

## Three.js — GLTFExporter r186 source

- URL: https://github.com/mrdoob/three.js/blob/r186/examples/jsm/exporters/GLTFExporter.js
- Observation: for a multi-material `Mesh`, the exporter iterates `BufferGeometry.groups` and writes a separate glTF primitive for each group; it returns no mesh data when a multi-material geometry has no groups.
- Intended operation: expose the same render-primitive ownership in repository `inspect()` and reject malformed multi-material group ranges before a browser/export pass.
- Test/example: `inspect()` now reports `primitives` separately from logical `meshes`, and tests cover missing groups, invalid material indices and valid semantic material runs.
- Result: authoring diagnostics match the locked exporter contract before the expensive gallery bake begins.
- Limitation: this is version-specific behavior checked against the repository's pinned Three.js r186; a future dependency update should re-run the exporter regression.

## Three.js — GLTFLoader multi-primitive behavior

- URL: https://github.com/mrdoob/three.js/issues/30090
- Observation: Three.js documents in its loader issue discussion that a glTF mesh with multiple primitives is represented as a group containing one `THREE.Mesh` per primitive. This means application object counts are not round-trip invariants for multi-material assets.
- Intended operation: stop treating raw `Mesh` count as a portable GLB invariant while retaining it as a useful authoring-scene statistic.
- Test/example: the material-region regression deliberately asserts that logical mesh count changes after GLB reload while primitive count, triangles and dimensions remain stable.
- Result: the regression directly covers the failure seen in the Pages bake after semantic material regions were introduced.
- Limitation: this does not promise stable loader hierarchy across unrelated loaders or future Three.js versions; the portable invariant is the glTF primitive/material partition plus geometry, not a Three.js object-tree shape.

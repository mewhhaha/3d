# Closest-surface continuous attribute transfer — research notes

Accessed 2026-09-16. Only public written documentation and the repository's pinned Three.js r186 source were used.

## Blender Manual — Sample Nearest Surface

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/mesh/sample/sample_nearest_surface.html

Observed: the node finds the closest point on a source mesh surface and interpolates non-face attribute values there. It can also constrain sampling with group IDs. Adaptation: `transferSurfaceAttributes()` finds the closest source triangle for every target vertex, computes barycentric coordinates at that closest point, and interpolates explicitly selected continuous per-vertex values. V1 does not implement source groups.

## Blender Manual — Data Transfer Modifier

Source: https://docs.blender.org/manual/en/4.5/modeling/modifiers/modify/data_transfer.html

Observed: mesh data transfer separates the data being copied from the mapping used to find matching source elements; nearest-face interpolation is one mapping family, and maximum distance can bound whether a mapping is accepted. Adaptation: the API requires an explicit attribute allow-list and offers `maxDistance`; exceeding it is a hard error rather than silently accepting a remote projection.

## Blender Manual — Attributes

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/attributes_reference.html

Observed: attribute domains and data types are semantically significant. UVs are face-corner data, while booleans/integers describe discrete values differently from continuous float/vector/color data. Adaptation: v1 intentionally accepts only non-normalized Float32 attributes stored one value per source vertex. UVs, normals, tangents, skin indices/weights and other known domain-specific semantics are rejected instead of being generically smeared.

## Three.js r186 — BufferGeometry and Triangle

Sources:
- https://threejs.org/docs/pages/BufferGeometry.html
- pinned local source: `node_modules/three/src/math/Triangle.js`

Observed: BufferGeometry stores indexed triangle topology and arbitrary named vertex attributes in buffers. The pinned `THREE.Triangle` implementation exposes `closestPointToPoint()` and `getBarycoord()`. Adaptation: the repository uses those existing r186 primitives and adds no dependency. The current search is deliberately brute-force over source triangles so correctness and ownership are easy to inspect before adding an acceleration structure.

## Repository experiment

`attribute-transfer-study` exercises the same operation on two different topology changes:

- an organic guide-swept leaf/crest is solidified, then its continuous green-to-gold source color is projected onto the generated shell;
- a separately deformed mechanical panel creates an independently owned perimeter profile, then the source cyan-to-coral field is projected onto that additive trim.

Both plain and transferred study cases have identical geometry counts; only the selected continuous attribute changes. Locked front/three-quarter/side material, clay, wire and silhouette renders verify that this is data transfer rather than a geometry replacement.

Limitations: v1 is O(target vertices × source triangles), has no BVH/spatial index, group/part restriction, normal-facing filter, ray projection or ambiguity resolution for nearby folds/sheets. Closest-surface transfer can therefore jump to a geometrically near but semantically unrelated surface. The helper transfers only explicitly selected continuous per-vertex Float32 data; it does not claim UV, split-normal, tangent, skinning, morph, face/edge-domain or discrete-label transfer. GLTF export of arbitrary custom attributes is a separate concern from the in-memory authoring operation.

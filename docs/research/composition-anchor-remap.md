# Persistent-anchor remap through owned geometry composition

Accessed 2026-09-17. Project dependency checked against Three.js r186 (`0.186.0`). These notes record only the written material used to choose and bound the repository adaptation.

## Three.js r186 — BufferGeometry

Source: https://threejs.org/docs/pages/BufferGeometry.html (Three.js contributors; publication date not stated).

Observation: an indexed `BufferGeometry` stores each triangle as three ordered vertex indices, and `applyMatrix4()` applies a 4×4 transform to the geometry. The documentation also separates geometry indices from rendering `groups`.

Repository adaptation: `composeGeometries()` already copies each input part's index sequence without reordering its triangle corners, adding deterministic vertex and face offsets while applying the part transform to positions/normals. The composition metadata now records each source part's indexed-topology signature. `remapCompositionAnchor()` uses the explicit part name plus that exact offset relationship to map a pre-composition barycentric anchor to the copied face; it does not search the merged surface.

Test/example/result: one anchor bound to a source leaf is remapped into three transformed copies of the same topology by the explicit names `left`, `center`, and `right`. A unit test also applies translation, rotation, and non-uniform positive scale and verifies the remapped anchor origin matches the transformed source barycentric point within `1e-6` meters.

Limitation: Three.js does not provide repository-specific semantic provenance for a merge. The exact part/face relationship is guaranteed by this repository's own constructor and tests, not inferred from the Three.js API.

## Three.js r186 — Matrix4

Source: https://threejs.org/docs/pages/Matrix4.html (Three.js contributors; publication date not stated).

Observation: `Matrix4.compose(position, quaternion, scale)` constructs a transform from position, rotation, and scale; matrices are the standard Three.js representation for transforming 3D points.

Repository adaptation: the existing composition stage bakes a part transform into the copied geometry. Barycentric coordinates and the anchor's affine tangent weights remain attached to the same ordered source corners, so remapping needs no new nearest-point solve. Clearance and component-local edits intentionally remain authored in the resulting support frame rather than being silently multiplied by the part scale.

Test/example/result: the transformed-composition unit fixture resolves the remapped anchor on the combined topology and compares its support origin to the source anchor origin transformed by the same `Matrix4`.

Limitation: this checkpoint does not add a general hierarchy/dependency transform system. The anchor becomes owned by the combined geometry after remap; later topology changes still require their own provenance/remap contract.

## Blender 4.5 LTS — Transform Geometry node

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/geometry/operations/transform_geometry.html (Blender Foundation documentation contributors; publication date not stated).

Observation: Transform Geometry applies translation, rotation, or scale to an entire geometry in local space rather than editing individual points as separate authoring operations.

Repository adaptation: composition treats per-part transforms as a construction step on independently authored geometry, then records exact ownership in the merged result. Persistent anchors are therefore bound while the component is still easy to author locally and remapped only after the known transform/merge stage.

Test/example/result: the mechanical fixture binds a service sensor on a housing and a latch on a routed rail before either part is transformed into the assembly. Both anchors resolve on the combined topology after independent transforms.

Limitation: Blender's Geometry Nodes evaluation, attribute propagation, instances, and dependency graph are not reproduced here. This is a bounded constructor-owned face/corner remap for static authoring geometry.

## Blender 5.3 development manual — Join Geometry indices (version-specific cross-check)

Source: https://docs.blender.org/manual/id/dev/modeling/geometry_nodes/geometry/join_geometry.html (Blender Foundation documentation contributors; development manual observed 2026-09-17).

Observation: the development manual explicitly documents a join convention where input element indices are merged in input order, with later inputs receiving offsets rather than being reordered.

Repository adaptation: this is a useful modeling precedent for the repository's already-tested deterministic offset convention, but it is **not** treated as a Blender 4.5 compatibility guarantee or as a dependency. `composeGeometries()` implements and tests its own face/vertex offsets, and `remapCompositionAnchor()` validates the expected target corner indices before accepting the remap.

Limitation: this source is a development-version Blender manual and may differ from the repository's native Blender validation version. It informs the construction model only; correctness here is established by the repository implementation and regression tests.

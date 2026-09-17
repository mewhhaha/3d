# Shared deformation space across separate components

Accessed: 2026-09-17

## Blender 4.5 LTS Manual — Lattice Modifier

- URL: https://docs.blender.org/manual/ka/4.5/modeling/modifiers/deform/lattice.html
- Publisher/author: Blender Foundation documentation contributors; page last updated 2026-08-27.
- Actual observation: the Lattice modifier names one lattice object as the deformation source, keeps optional per-object vertex-group influence separate, and explicitly notes that multiple objects can use the same lattice so they can be edited together. The manual also notes that lattice deformation does not change mesh texture coordinates.
- Intended repository operation: one authored deformation field should be evaluable against several separately owned component geometries instead of forcing a merge or duplicating cage coordinates per component. Each component still owns its own selection/mask and export object.
- Test/example: `tests/geometry-deform-parent.test.js` applies one parent-space lattice to two differently translated/rotated/non-uniformly-scaled indexed meshes, composes the independently deformed results, and compares them against deforming the already-composed geometry. `models/geometry-assembly-deform-study.js` uses the same contract for a layered creature mass and a layered service housing.
- Result: the focused coordinate-equivalence test passes within 4e-6 m; the controlled study passes four cases / 48 images with identical baseline/shared triangle count (6,844) and zero GLB validation errors/warnings.
- Limitation/adaptation: this does not reproduce Blender's modifier stack, parenting command, lattice interpolation modes, runtime non-destructive modifier object, or arbitrary scene hierarchy. The repository evaluates a construction field once and returns owned `BufferGeometry`.

## Three.js r186 — Object3D and Matrix4

- URLs: https://threejs.org/docs/pages/Object3D.html and https://threejs.org/docs/pages/Matrix4.html
- Publisher/author: Three.js project documentation; publication date not stated; accessed 2026-09-17. Project dependency is locked to Three.js r186.
- Actual observation: `Object3D.matrix` represents the object's local transform, while `matrixWorld` represents the accumulated world transform; `Matrix4.compose()` constructs translation/rotation/scale transforms and `invert()` supplies the inverse mapping for invertible transforms.
- Intended repository operation: keep component geometry local and evaluate a chosen deformation field in an explicit parent/assembly space by applying the component local-to-parent matrix before the field and its inverse afterward.
- Test/example: the parent-space test uses authoring-style position/XYZ-degree rotation/positive scale on both components, including non-uniform scale, and verifies that independent deformation matches the equivalent composed-space deformation.
- Result: identity placement is numerically equivalent to ordinary `deformGeometry()`, transformed components match the composed-space reference, sources remain unchanged, and component output buffers remain independent.
- Limitation/adaptation: the new helper accepts a single explicit local-to-parent placement rather than querying `Object3D.matrixWorld`; nested scene traversal stays outside geometry helpers so recipe construction remains deterministic, synchronous and independent of a live scene graph.

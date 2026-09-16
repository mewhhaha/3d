# Surface-aware assembly research notes

Accessed 2026-09-16. These notes record only written material that affected the bounded surface-mount operation.

## Blender Manual — Shrinkwrap Constraint

- URL: https://docs.blender.org/manual/en/4.5/animation/constraints/relationship/shrinkwrap.html
- Author: Blender Foundation documentation contributors. Version: Blender 4.5 LTS.
- Observation: Nearest Surface Point selects the closest location on the target surface. Above Surface applies clearance along the target's smooth normal. The constraint can also align an object-local axis to that smooth normal.
- Adaptation here: a `surfaceMount` stores a support-local seed point and optional named face-region constraints. Resolution finds the closest allowed triangle, evaluates a smooth barycentric normal when vertex normals are present, applies an explicit normal offset, and constructs a local frame for an independently editable component.
- Test/example: the same leaf/bud mount data is resolved against both an open and a curled leaf support; the same panel/sensor mount data is resolved against both flatter and arched support geometry.
- Limitation: this repository does not implement Blender's projection modes, inside/outside tests, target-normal search, constraint influence, or scene dependency graph.

## Blender Manual — Shrinkwrap Modifier

- URL: https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/shrinkwrap.html
- Author: Blender Foundation documentation contributors. Version: Blender 4.5 LTS.
- Observation: the general modifier separates target-point selection from snap/offset behavior, and its Above Surface mode uses the smooth target normal rather than the original-to-target projection vector.
- Adaptation here: target selection, surface orientation, authored clearance, and the component's local edit transform are separate fields. The API does not hide clearance inside the component geometry or mutate the support mesh.
- Result: changing support curvature re-evaluates the attachment pose without rewriting the bud/sensor geometry or its local adjustment.
- Limitation: this is object/component placement, not per-vertex wrapping, collision detection, or deformation.

## Three.js — Matrix4

- URL: https://threejs.org/docs/pages/Matrix4.html
- Author: Three.js contributors. Dependency checked against repository Three.js r186.
- Observation: `Matrix4.makeBasis()` builds a transform from explicit basis vectors, and `Matrix4.compose()` combines position, quaternion, and scale.
- Adaptation here: the attachment frame uses tangent / bitangent / normal as +X / +Y / +Z. The support-frame transform is post-multiplied by an authored local position/rotation/scale, keeping support following separate from component edits.
- Test/example: tests verify that local +Z aligns to the support normal, local roll remains editable, and repeated resolution is deterministic.
- Limitation: the implementation uses one projected support-local tangent hint to resolve roll; it is not curve parallel transport and can become underconstrained when the hint is nearly parallel to the normal, where a deterministic triangle-edge fallback is used.

## Three.js — Quaternion

- URL: https://threejs.org/docs/pages/Quaternion.html
- Author: Three.js contributors. Dependency checked against repository Three.js r186.
- Observation: Three.js quaternions represent normalized object rotations and can be constructed from a pure rotation matrix.
- Adaptation here: a basis matrix is converted to a quaternion, then the final composed matrix is decomposed back to ordinary Object3D position/quaternion/scale so attached components remain normal editable Three.js objects.
- Limitation: no shear/reflection is supported; mount-local scale must remain positive.

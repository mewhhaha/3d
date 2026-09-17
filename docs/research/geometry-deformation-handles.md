# Research notes — local bend / twist / taper handles

Accessed 2026-09-17. These notes record design evidence for the bounded `BufferGeometry` deformation layer; they are not copied tutorial content.

## Alan H. Barr — “Global and local deformations of solid primitives” (SIGGRAPH 1984)

Source: https://authors.library.caltech.edu/records/99pd2-73028 · published July 1984. The Caltech record exposes the abstract and publication metadata; the ACM DOI is https://doi.org/10.1145/800031.808573.

Observation: Barr presents bend, twist, taper and related position-dependent transforms as intuitive modeling operations that can be composed hierarchically. The paper also treats transformed normals as dependent data rather than something to leave stale after a deformation.

Repository adaptation: add a small analytic menu for broad primary-form edits rather than a free-form lattice system. Each operation is evaluated in an explicit authoring frame, operations compose sequentially, positions change while topology stays fixed, and normals are rebuilt from the resulting mesh. We do not copy the paper's full differential/Jacobian normal formulation because the repository owns an indexed triangle mesh and already has a deterministic normal rebuild path.

Test/example: a straight creature tendril uses taper + twist + bend; a separate hard-surface service bracket applies the same handle vocabulary only to its named flex region. Tests verify analytic bend positions, selection isolation, topology/UV/custom-attribute preservation, and explicit rig/morph rejection.

Result/limits: this removes chains of hand-authored vertex pulls for common broad edits. It is a fixed deformation vocabulary, not FFD, elasticity, collision handling or automatic rig refitting.

## Blender Manual — Simple Deform Modifier

Source: https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/simple_deform.html · accessed 2026-09-17; current manual result observed as Blender 5.2 LTS.

Observation: Blender exposes Twist, Bend, Taper and Stretch as local-coordinate deformations. An origin/orientation object can define the deformation frame, an axis chooses the deformation direction, limits bound the affected axial span, and a vertex group independently controls influence.

Repository adaptation: `deformationHandle()` owns origin, XYZ-degree rotation, positive scale and a finite local range; local +Y is the deliberately fixed v1 deformation axis. The operation (`bendVertices`, `twistVertices`, `taperVertices`) remains separate from the point-domain selection, so named face regions, radial masks and projected stroke masks can all control influence without becoming part of the deformation math. Unlike Blender, the current v1 does not offer arbitrary X/Y/Z axis switches, lock axes, stretch mode or an object dependency graph.

Test/example: the mechanical fixture uses a reusable local frame and a semantic face-region selection, keeping its mounting foot independent of the flexible upper member.

Result/limits: frame placement and influence can be edited independently, but partial weights blend undeformed/deformed positions and therefore are an authoring approximation rather than a physical material model.

## Three.js r186 — Matrix4

Source: https://threejs.org/docs/pages/Matrix4.html · accessed 2026-09-17. Repository dependency is locked to Three.js `0.186.0`.

Observation: `Matrix4.compose(position, quaternion, scale)` and `invert()` provide the exact primitives needed to evaluate a deformation in one local frame and map the result back to geometry-local coordinates.

Repository adaptation: handle translation/rotation/scale is composed into one matrix; geometry points are transformed into handle space, analytically deformed, then returned through the same frame. Positive handle scales are required so the inverse is well-defined and mirrors remain explicit geometry operations elsewhere in the workshop.

Test/example: tests move the same bend handle origin without rewriting the source mesh or bend formula and verify the result changes while the source stays untouched.

Result/limits: this is geometry-local authoring data only; there is no scene-object parenting or exported modifier stack.

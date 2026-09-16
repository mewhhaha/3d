# Research note: surface-local attachment frames

Accessed: 2026-09-16.

## Blender 4.5 LTS Manual — Shrinkwrap Modifier

Source: https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/shrinkwrap.html

Observed: Blender separates how a point is located on a target from how clearance is applied. In particular, `Above Surface` applies offset along the target's smooth normal. Different wrap methods solve nearest-point/projection problems separately.

Adaptation here: our regular parametric surfaces already provide a known chart coordinate, so `surfaceTransform()` does **not** add nearest-point search. It makes the existing chart-local tangent/bitangent/normal frame explicit, gives authors normal offset and tangent-plane slide in meters, and keeps those operations separate from shape tessellation.

Limitation: this is not Shrinkwrap. It will not find a target point for arbitrary source geometry, handle mesh boundaries, determine inside/outside, or repair intersections.

## Blender 4.5 LTS Manual — Shrinkwrap Constraint / Align To Normal

Source: https://docs.blender.org/manual/en/4.5/animation/constraints/relationship/shrinkwrap.html

Observed: an attached object's chosen local axis can be aligned to the target's smooth normal after placement. Orientation is therefore a separate concern from positional projection/offset.

Adaptation here: `surfaceTransform()` returns an orientation whose local +Z is the surface normal, +X is the chart's `du` tangent and +Y is the derived bitangent. An explicit local XYZ rotation is then composed after alignment. This lets an authored vent, spine, socket or plate keep its own local adjustment instead of baking world-space Euler angles into the recipe.

Limitation: the frame follows the authored chart, so a poorly parameterized or degenerate chart still produces poor attachment behavior. There is no automatic minimal-rotation transport from one sample to another.

## Three.js Matrix4 / Object3D documentation

Sources:
- https://threejs.org/docs/pages/Matrix4.html
- https://threejs.org/docs/pages/Object3D.html

Observed: `Matrix4.makeBasis()` constructs a transform basis from three axes, while `Object3D` exposes local position/quaternion transforms. This matches the repository's existing differential surface frame directly without introducing a separate math dependency.

Adaptation here: the attachment pose is composed from the differential basis and copied into ordinary `Object3D.position` / `quaternion`. Scale is deliberately not part of the attachment operation.

## Blender Studio — Creating Clothing Basemeshes, Julien Kaspar

Source: https://studio.blender.org/training/stylized-character-workflow/5d7f7fc5db37a94301d88ff9/

Observed from the public written page: clothing base meshes differ from body base meshes because they generally start without thickness, which makes them harder to handle as independent forms. The public page does not expose enough of the lesson to attribute a specific modeling sequence beyond that statement.

Workflow implication: keep the support surface, its normal offset, and later physical thickness as distinct authoring stages. `surfaceLayer()` remains the shape-offset operation; `surfaceTransform()` / `surfacePath()` place secondary forms against the same support; `thickenSurface()` remains a separate geometry step. This avoids using attachment transforms as a substitute for actual shell construction.

## Tested result in this repository

`models/surface-attachment-study.js` exercises the operations on two unrelated subjects:

- an organic creature-like carapace with normal-aligned spines and collars;
- a curved mechanical panel with tangent-local vents, a slid socket and a routed service cable authored in chart coordinates.

The cyber limb inlay was also migrated from 25 temporary `Object3D` attachments to `surfacePath()` without changing the support or authored route formula.

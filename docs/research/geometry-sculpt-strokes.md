# Research notes — reusable 3D stroke paths and local symmetry

Accessed: 2026-09-17. Scope: extend topology-preserving `BufferGeometry` sculpt selections from isolated radial fields to reusable elongated paths, explicit local frames, and bilateral reuse. This is a code-first construction adaptation, not an interactive Blender Sculpt Mode clone.

## Blender 4.5 LTS — Stroke

Source: https://docs.blender.org/manual/en/4.5/sculpt_paint/brush/stroke.html

Observation: Blender separates the stroke method from the brush effect. Space/Line/Curve strokes create repeated applications along a path, and sculpt-only Scene spacing computes spacing from the 3D stroke location to keep spacing more consistent across curved surfaces.

Repository adaptation: preserve the same useful separation between **where influence lies** and **what edit it drives**. `pathSelection()` is a static geometry-local 3D polyline field; `pullVertices()`, `inflateVertices()` and `smoothVertices()` remain independent consumers. The implementation measures nearest 3D segment distance directly rather than constructing a hidden chain of radial dabs. It does not implement mouse sampling, pressure, Scene/View spacing, or Blender's Curve datablocks.

Test/example: a hard-surface service panel routes one multi-turn seam from five authored path points and then places that same path through a rotated local selection frame. The operation produces one continuous recessed field while preserving the source index topology.

Result: a seam can be moved or reshaped by editing one path/frame instead of maintaining a collection of unrelated radial centers.

Limitation: this path is Euclidean in geometry-local 3D, not geodesic or surface-projected. Curved surfaces still need suitable authored 3D samples and optional facing/semantic constraints.

## Blender 4.5 LTS — Sculpt symmetry

Source: https://docs.blender.org/manual/en/4.5/sculpt_paint/sculpting/tool_settings/symmetry.html

Observation: Blender mirrors brush strokes across selected **local axes**; axis orientation belongs to the sculpted model's local construction orientation rather than being an arbitrary global screen rule.

Repository adaptation: `symmetrySelection()` reflects selection evaluation across an explicit local axis/plane, while `framedSelection()` lets the whole selection—including its symmetry plane when nested—live in an authored local frame. The repository reuses the existing `symmetry.js` reflection primitives instead of adding a second mirror convention.

Test/example: the organic fixture authors only one creature facial-ridge path on +X, mirrors it across local X, then moves/rotates the bilateral selection as one frame before intersecting it with `creature.face` and +Z-facing weights.

Result: bilateral construction intent is represented once and remains independently placeable from the underlying mesh and scene transform.

Limitation: only mirror symmetry is added to the point-selection layer here. Radial/tiling symmetry, seam feathering, and interactive symmetry correction are not implemented.

## Three.js r186 — `Line3` and `Matrix4`

Sources:
- https://threejs.org/docs/pages/Line3.html
- https://threejs.org/docs/pages/Matrix4.html

Observation: `Line3.closestPointToPointParameter()` returns the projected closest parameter on a segment and can clamp it to `[0,1]`; `Matrix4.compose()` and `invert()` provide the ordinary affine transform/inverse used to move between authored frames and geometry space.

Repository adaptation: each `pathSelection()` segment uses Three.js's clamped segment parameter so the selector can interpolate endpoint radii at the actual nearest point. `framedSelection()` composes a local-to-geometry transform from meter translation, degree rotation, and positive scale, then evaluates the child selection through its inverse. Normals are transformed with the corresponding normal matrix.

Test/example: unit tests verify a rotated local path selects the expected geometry-space samples, a variable-radius path keeps exact zero outside support, and local-X symmetry selects both sides while the original one-sided field does not.

Result: the implementation stays on the project's locked Three.js r186 math primitives and adds no dependency.

Limitation: frame scaling changes selection-space metric intentionally; zero/negative scales are rejected. This is an authoring frame, not a general object hierarchy or shear/reflection transform API.

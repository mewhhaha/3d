# Profile sweep research notes

Accessed 2026-09-16. Scope: turning an authored 3D guide into a ribbon, strap, trim or non-circular tube while keeping guide shape, section shape, taper and roll independently editable.

## Blender 4.5 LTS Manual — Curve Geometry

Source: https://docs.blender.org/manual/en/4.5/modeling/curves/properties/geometry.html

Actual observation: Blender's curve geometry separates the base spline from cross-section/bevel geometry, exposes a separate taper object for scale along the spline, and treats tilt as rotation around the tangent. The manual explicitly notes that the taper object is really a general scale curve rather than only an end taper.

Adaptation here: `profileSweepGeometry()` accepts one 3D `path`, an independent 2D `profile`, a scalar or anisotropic `scale` field, a local-section `offset` field, and the transported-frame `tilt` stage from `curve-frame.js`. Representation resolution lives in `segments`, not in the authored section coordinates.

Test/example: the organic fixture is an open crest/ribbon with anisotropic taper and progressive tilt; the mechanical fixture is a closed six-point strap with caps plus a separately offset trim profile using the same guide.

Limitations: this is not Blender's curve object system. There is no editable control-point UI, bevel modifier stack, automatic profile smoothing, collision handling or curve-to-mesh node graph.

## Three.js r186 — ExtrudeGeometry

Source: https://threejs.org/docs/pages/ExtrudeGeometry.html

Actual observation: the project's pinned Three.js line supports extruding a 2D `Shape` along a 3D `extrudePath`, with path steps and a custom UV generator. The docs also state that bevels are not supported for path extrusion.

Adaptation here: the repository does not wrap `ExtrudeGeometry` for this operation because the workflow already has an explicit transported-frame field with authored `up` and `tilt`, and needs per-station anisotropic scale/offset. The new helper instead samples that existing frame field and writes ordinary indexed `BufferGeometry` with UVs. This keeps the framing behavior shared with curve attachments and offset routes.

Test/example: unit tests verify independent path tessellation, anisotropic taper, local profile offsets, open-ribbon topology, closed-loop seams and cap generation. Render fixtures then exercise those mechanics from multiple views.

Limitations: profile-path beveling is intentionally not added here. Sharp section corners are currently geometrically sharp but use shared side vertices and therefore smooth shading unless the authored profile is sufficiently resolved or a later crease-normal operation is applied.

## Three.js r186 — Shape

Source: https://threejs.org/docs/pages/Shape.html

Actual observation: Three.js `Shape` represents an arbitrary 2D contour and can also contain holes. It can provide triangulated geometry through Three.js shape/extrusion machinery.

Adaptation here: v1 deliberately accepts one simple 2D contour and uses Three.js' shape triangulation only for optional end caps. Open profiles are also allowed for ribbon/card-like surfaces, where caps are disabled. Holes are not accepted yet because side-wall generation for holes, profile winding semantics and UV ownership need an explicit design rather than being silently inherited from `Shape`.

Test/example: rectangular caps and a non-rectangular six-point mechanical section validate successfully as GLB; the open five-point organic section proves the no-cap branch.

Limitations: self-intersecting contours, holes, seam welding, profile booleans and automatic repair are out of scope. A cap triangulating does not imply the swept solid is globally watertight or free of self-intersections along a tight guide.

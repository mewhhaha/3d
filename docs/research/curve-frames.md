# Curve framing research notes

Accessed 2026-09-16. Scope: stable local frames for sweeps, offset routes and repeated attachments along authored 3D curves.

## Hanson & Ma — Parallel Transport Approach to Curve Framing (1995)

Source: https://scholarworks.iu.edu/dspace/items/39fbe931-c2c8-43a1-9c9d-a207b92d551e

Actual observation: the report motivates parallel-transport moving frames for ribbons, tubes and camera orientation because Frenet framing can become ambiguous or flip when curvature vanishes. The discrete construction transports an initial normal by the minimal rotation carrying one sampled tangent to the next.

Adaptation here: `transportedFrames()` samples the existing Three.js curve by arc length, seeds one author-visible normal, then uses the shortest quaternion between adjacent tangents to carry that normal forward. Every step reprojects the normal against the current tangent to suppress numerical drift. This is a sampled rotation-minimizing frame field, not an exact symbolic differential-geometry solver.

Test/example: an S-shaped inflected curve asserts orthonormal frames and no adjacent normal flip. Both study fixtures deliberately contain direction reversals/inflections.

Limitation: sampling density still matters on very sharply turning curves. This does not infer collision-free sweeps or topology.

## Blender Manual — Set Curve Normal / Minimum Twist

Source: https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/curve/write/set_curve_normal.html

Actual observation: Blender exposes a `Minimum Twist` curve-normal mode and treats per-point tilt as a separate authored quantity that modifies the final frame around the curve tangent.

Adaptation here: transported orientation and authored roll are likewise separate. `tilt` is applied in degrees around each sampled tangent *after* transport, and may be a constant or a function of normalized curve position. The API does not copy Blender's Geometry Nodes data model or its free-normal attributes.

Test/example: the organic fixture applies progressive tilt to collars while keeping their tangent direction and path position unchanged; the mechanical fixture uses a sinusoidal tilt for repeated clamps.

Limitation: there is not yet a sparse control-point tilt interpolator; the caller supplies a function when varying roll is needed.

## Three.js r186 — Curve.computeFrenetFrames

Source: https://github.com/mrdoob/three.js/blob/r186/src/extras/core/Curve.js

Actual observation: the project's pinned Three.js `Curve.computeFrenetFrames()` already uses the Hanson/Ma-style slowly varying normal transport internally and performs a distributed seam correction for closed curves. The helper, however, returns only arrays selected by its own initial-normal heuristic and offers no authored seed, local transforms, offset-route helper or explicit tilt stage.

Adaptation here: the reusable module preserves Three.js' default seed direction for compatibility, but makes the initial `up`, per-sample local poses, local XY offsets and tilt explicit. `sweep()` and the cyber `cableLoom()` now consume the same authoring frame field instead of each reaching into `computeFrenetFrames()` independently.

Test/example: a compatibility assertion compares default `offsetCurvePoints()` with the pinned r186 frame normals, so migrating the cyber cable loom does not silently reverse its bundle ordering.

Limitation: this module intentionally remains a construction helper over Three.js Curve instances. It does not replace Three.js curve interpolation or TubeGeometry.

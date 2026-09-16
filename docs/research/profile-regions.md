# Research note — semantic regions in profiled sweeps

Accessed 2026-09-16. Scope: keep semantic selections tied to an authored guide/profile construction rather than world coordinates or tessellation-specific triangle IDs.

## Blender 4.5 LTS Manual — Curve to Mesh Node

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/curve/operations/curve_to_mesh.html

Actual observation: Curve to Mesh treats the path spline and profile curve as separate inputs, transfers attributes into the generated mesh, and optionally creates explicit end caps for cyclic profiles. The documentation also distinguishes generated profile-driven sharp edges from the path itself.

Adaptation here: `profileSweepGeometry()` now exposes its own exact construction roles with `regionPrefix`, producing named face regions such as `<prefix>.side`, `<prefix>.cap.start`, and `<prefix>.cap.end`. These roles come from the constructor's face ordering, not a later proximity or centroid guess. This does not copy Blender's node system or attribute propagation rules; it exposes only the face-domain semantics this repository can verify.

## Blender 4.5 LTS Manual — Spline Parameter Node

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/curve/read/spline_parameter.html

Actual observation: the Spline Parameter factor represents progress along spline length rather than simply dividing a control-point index by point count. The manual warns that evaluated curve points and authored control points need not correspond one-for-one.

Adaptation here: sweep-region predicates receive normalized `pathStart`, `pathEnd`, and `pathMid` values from the same arc-length `getPointAt()` sampling used by transported frames. A semantic region such as a leaf tip can therefore be expressed as `pathMid >= 0.7` and remains meaningful when path control points move or sweep tessellation changes. Side predicates also receive normalized profile-perimeter intervals and the authored profile edge index. The metadata is evaluated during construction and only resolved face IDs are stored.

## Three.js r186 — BufferGeometry

Source: https://threejs.org/docs/pages/BufferGeometry.html

Actual observation: `BufferGeometry.groups` are draw-call/material partitions and groups must not overlap. `userData` is the ordinary place for custom application metadata.

Adaptation here: sweep semantic regions continue to use the repository's overlapping face-region metadata rather than overloading material groups. Structural and authored region names may overlap on the same triangle and can later constrain spatial queries, attachments, masks, or exact topology remapping.

## Test/example/result

Unit tests verify exact side/cap counts, cap-role equivalence, open-profile omission of nonexistent caps, name collisions, and normalized path/profile predicates at two tessellation levels. `models/profile-region-study.js` exercises two different subjects: an open organic leaf whose sweep-space tip/ridge regions are preserved through solidification, and a closed mechanical strap whose side, terminal cap, mount zone, and service flank drive highlights and an attachment query.

## Limits

This is face-domain construction metadata, not a persistent parametric CAD history. Rebuilding the sweep regenerates regions exactly from the predicates, but arbitrary downstream booleans/remeshing still need explicit provenance or correspondence. Profile predicates identify perimeter intervals/edges, not holes or nested contours; closed profiles with holes are still unsupported. Regions are authoring metadata and are not exported as glTF semantics.

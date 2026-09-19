# Anchored module attitude and cowl clearance

Accessed 2026-09-19. Read substantive written documentation returned by the web
search tool; several direct manual opens returned 402. No instructional video
was watched or tutorial asset copied.

- **Blender Manual, Damped Track Constraint (4.1)**
  https://docs.blender.org/manual/en/4.1/animation/constraints/tracking/damped_track.html
  describes one local-axis alignment using a pure shortest swing and influence,
  for objects as well as bones. This informed the minimum-swing orientation
  operation. Our adaptation adds translation compensation to preserve an
  arbitrary local anchor; it is not Blender's constraint or a tracking system.
- **Three.js, Quaternion**
  https://threejs.org/docs/pages/Quaternion.html
  documents normalized inputs for `setFromUnitVectors` and spherical
  interpolation. Checked against the locked r186 implementation. Used explicit
  normalized direction vectors, unit quaternion validation, and influence.
- **Blender Manual, Shrinkwrap Modifier (2.81)**
  https://docs.blender.org/manual/en/2.81/modeling/modifiers/deform/shrinkwrap.html
  distinguishes projection along a chosen axis and an outside offset from
  nearest-surface fitting. This informed fitting the cowl along its optical
  axis. Our private fit is analytical against one sphere, not a general mesh
  shrinkwrap, and does not guarantee collision-free triangles or assemblies.

Examples: two shoulder optical modules and an unrelated ball-mounted inspection
instrument. Tests check anchored placement under transformed parents, exact
port-center preservation, unchanged emitter mesh data, analytic sleeve contacts
and sampled cowl/core clearance. Rendered side/back views expose limitations
that a reference-camera-only alignment would hide. Initial rotated-cowl trials
intersected the shoulder sphere; the accepted fit clears its vertices without
moving arm joints. Full checks/rejections are in the checkpoint journal.

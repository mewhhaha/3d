# Connected limb poses and post-pose form correction

Accessed 2026-09-17. No video content or tutorial assets were used.

- Blender Manual, **Inverse Kinematics Constraint**:
  https://docs.blender.org/manual/id/5.0/animation/constraints/tracking/ik_solver.html
  Accessible substantive text distinguishes a target controlling a hand from a pole
  controlling the elbow/bend-plane roll, and makes stretching an independent option.
  Adaptation: a bounded analytic two-link position solver with explicit pole/swivel,
  fixed endpoints/lengths and rejection of unreachable targets. This is not Blender's
  general solver. Tests cover rigid-space equivariance, endpoint preservation,
  singular poles, extension and reach failures. Actual users are android joint
  construction and a two-link inspection boom with a fixed sensor.

- Julien Kaspar, Blender Studio, **6 — Pose Polishing**:
  https://studio.blender.org/training/stylized-character-workflow/5d66533123bda402f76bd3f7/
  The accessible written passage describes preserving an overall limb-rotation
  shape and separate adjustment shapes to correct volume/twisting after a simple
  rig. Observation concerns that written description only, not its video.
  Adaptation: keep pose construction separate from a new limb-support/shell variant;
  compare unchanged pose + new shell and then connected-pose + new shell. Avoid
  deforming rigid bearings while their neighboring joint centers stay fixed.
  No shape-key/skin workflow is claimed for this rigid scene.

- Blender Manual, **Solidify Modifier**:
  https://docs.blender.org/manual/en/5.0/modeling/modifiers/generate/solidify.html
  Describes explicit thickness, rim fill and approximate even thickness. We reuse
  the workshop's existing contour + solidification operations, retaining separate
  inner/outer/rim ownership and documenting inherited nonuniform limb scaling.
  No copied assets, automatic collision repair or exact-thickness guarantee.

Results and rejected experiments are in the limb checkpoint and its render report.
The research supports separation of responsibilities, not an inferred exact anatomy
or a claim to have reconstructed hidden reference geometry.

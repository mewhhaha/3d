# Plain humanoid foundation and support-leg posing

Accessed 2026-09-20; written primary documentation only.

- Adobe, **Upload and rig 3D characters with Mixamo** (updated 2021-09-14):
  https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html
  The public instructions start from a library or custom character, place
  wrist/elbow/knee/groin markers, then rig and animate. The service requires
  Adobe-ID sign-in; rigged upload is FBX. Adaptation: establish body landmarks
  and a neutral skeleton before costume. No service upload, library download,
  third-party Sketchfab asset, or tested Mixamo retargeting is claimed.
- Adobe, **Mixamo FAQ**:
  https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
  The auto-rigger expects a centered, neutral humanoid without large props,
  disjoint parts or extra scene content. This supports keeping armor, hair and
  the backpack out of this review. Our segmented proxy already has skinning,
  but is not presented as a validated auto-rigger input or an Adobe model.
- Blender Manual, **Inverse Kinematics Constraint** (5.0 written manual):
  https://docs.blender.org/manual/id/5.0/animation/constraints/tracking/ik_solver.html
  Targets define endpoint placement; poles govern the bend plane, while stretch
  is a distinct option. Adaptation: retain the existing fixed-length two-link
  solver and add an explicitly bounded root slide to control knee extension.
  The law-of-cosines/line-sphere construction is our implementation, not Blender's
  algorithm. It controls kinematics only, not physical balance or contact forces.

Exercises/results: same T-bind mannequin on slender/broad configurations, a
support-leg shot candidate with both soles planted, and an unrelated sliding-root
inspection boom. Focused tests check unchanged lengths, owned arrays, nonvertical
slide axes, invalid targets, rollback after opposite-leg failure and skin/GLB
isolation. Render and reimport evidence is recorded in the support-leg checkpoint.
No video content, copyrighted meshes, or promotional images were copied.

# Pose overlaps and explicit joint planes

Accessed 2026-09-19.

- Stan Prokopenko, **How to Draw Structure in the Body – Robo Bean**:
  https://www.proko.com/course-lesson/how-to-draw-structure-in-the-body-robo-bean
  Read public Lesson Notes, not the video or premium content. The notes separate
  rib/pelvis orientation from their connecting region, and use visible planes
  and overlapping contours to convey twist. Adaptation: review the whole
  figure's far-arm overlap and thigh-to-pelvis continuity, not emitter-center
  error alone. No anatomy model or source artwork was copied.
- Blender Manual, **Inverse Kinematics Constraint**:
  https://docs.blender.org/manual/id/5.0/animation/constraints/tracking/ik_solver.html
  Accessible text explains the distinct roles of end target, pole target,
  chain length and optional stretch. The English/latest URL did not load.
  Adaptation: retain fixed target/length contracts and add an explicit middle
  joint-plane constraint. The circle-plane intersection is our analytical
  extension, not an algorithm attributed to Blender's IK implementation.

Operation/test: `twoLinkPose({jointPlane})`, exact branch/length/endpoint tests,
rigid-frame invariance, scaled plane equations, tangent/full-extension cases,
and explicit failure for impossible planes. Exercised on the far arm and an
unrelated service boom. Review fixed camera, material/clay/wire, side views and
GLBs. This does not recover occluded anatomy, solve mesh collisions or establish
likeness. Results/rejections live in the associated progress checkpoint.

A separate pelvis lesson search exposed public written notes, but the fetched
page did not expose the complete lesson body; no technique claim depends on that
incomplete access. Previously supplied tutorial videos remain unreviewed.

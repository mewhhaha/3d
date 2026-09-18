# Humanoid mass groups before mechanical dressing

Accessed 2026-09-18. Written primary-source notes were read; no video viewing,
paid course access or Arc System Works technique is claimed for this pass.

- **Stan Prokopenko, How to Draw Structure in the Body — Robo Bean**:
  https://www.proko.com/course-lesson/how-to-draw-structure-in-the-body-robo-bean
  The public lesson notes separate rib cage and pelvis, use their planes and
  skeletal landmarks to communicate orientation, and describe overlap/twist.
  Adaptation: retain the existing connected section pose, but shape rib, waist
  and pelvic volumes beneath the armor instead of shrinking every part uniformly.
  This is an authored robot interpretation, not recovery of anatomy from one view.
- **Stan Prokopenko, How to Draw Shoulder Muscles — Anatomy and Motion**:
  https://www.proko.com/course-lesson/how-to-draw-shoulder-muscles-anatomy-and-motion
  The public notes relate the scapula/humerus and their surrounding muscle groups.
  Adaptation: a tapered deltoid mantle bridges the visible shoulder mass into the
  upper arm. The servo ball remains a separate rigid joint, not the entire outer
  shoulder silhouette. No biomechanical simulation or skin rig is implied.
- **Blender 4.5 Manual, Brushes / Inflate**:
  https://docs.blender.org/manual/en/4.5/sculpt_paint/sculpting/introduction/brush.html
  https://docs.blender.org/manual/en/4.5/sculpt_paint/sculpting/brushes/inflate.html
  The documented volume-building tools distinguish form work from small detail;
  Inflate follows vertex normals. Our adaptation uses smooth *radial* fields on a
  section loft, not Blender's brush implementation and not a surface-normal inflate.

## Concrete implementation and exercise

Reuse `sectionLoft` and `radialMass` in `src/lib/forms/structure.js`. The only
library API extension is allowing `radialMass.angle` to be a function of normalized
longitudinal position. This makes oblique/sweeping masses expressible without
recipe-local point deformation or final-vertex coordinate tables. Scalar angles
are backwards compatible; both modes stay periodic and pin the end rings.

`cyber/mass-forms.js` authors broad quadriceps, calf, upper-arm/forearm and torso
volume groups. Ceramic contours and surface attachments evaluate the same support;
pose is applied afterward. An unrelated spiral elastomer grip uses the same angle
profile operation while retaining its end ferrules. Materials are unchanged.

The eight-case local review completed 44 material/clay/wire/silhouette and alternate
view captures. All three exports validate without errors/warnings. The new body's
shoulder-to-arm transition and calf/thigh cross-sections are clearer in clay than in
the full neon render. The latter is only a modest likeness improvement. These are
primary volumes, not a high-to-low normal bake, learned anatomy or finished skin.

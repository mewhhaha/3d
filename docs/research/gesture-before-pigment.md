# Gesture before pigment

Read 2026-09-19: Stan Prokopenko, **How to Draw Gesture**, public written Lesson
Notes: https://www.proko.com/course-lesson/how-to-draw-gesture

The notes distinguish the movement between forms from contour detail, prioritize
the longest action lines, and discuss asymmetry/opposed angles rather than
symmetrical stacked volumes. This directly motivated a separate whole-body
pose/proportion hypothesis rather than continuing to refine optical housings.
No video, premium transcript or tutorial asset was used. Our section-scale
implementation and particular android proportions are independent adaptations,
not an algorithm or anatomy attributed to the lesson.

Read 2026-09-19: Three.js **MeshStandardMaterial** documentation:
https://threejs.org/docs/pages/MeshStandardMaterial.html

The documented maps have separate roles; color maps carry pigment, roughness
maps affect reflection, and bump/normal maps change illumination rather than
geometry. This informed a controlled material-only comparison on unchanged
meshes. The implementation uses the repository's existing two-tone shader for
an additional authored look, with its explicit standard-PBR export fallback.
No new normal bake, physically accurate shadowing or Guilty Gear-equivalent
shader is claimed. The locked dependency is Three.js r186.

Attempted the Blender Studio Pose Polishing page; access returned an error, so
no new instructional claim relies on its inaccessible contents. Previously linked
construction videos remain unreviewed.

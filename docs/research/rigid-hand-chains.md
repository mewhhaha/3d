# Rigid hands and connected articulation

Accessed 2026-09-18. Public written text was read; no premium or video-only content
is claimed reviewed. No tutorial assets or source code were copied.

- Stan Prokopenko, **How to Draw Hands from Imagination — Step-by-Step**:
  https://www.proko.com/course-lesson/how-to-draw-hands-from-imagination-step-by-step
  The written lesson separates the hand's gesture from construction of the palm,
  wrist and fingers, and suggests grouping fingers or indicating knuckles before
  modeling their segments. Adaptation: a tapered palm, curved knuckle placement
  and non-identical digit curls replace the previous parallel block fingers.
  This is an artistic mechanical interpretation, not recovered human anatomy.
- Stan Prokopenko, **How to Draw Hands — Details for Realistic Hands**:
  https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands
  Public notes distinguish softer palm-side pads from flatter dorsal structures.
  Adaptation: distinct dark pads and dorsal ceramic plates on the same rigid link.
  This remains a small form distinction, not detailed skin sculpting.
- Blender Manual, **Armature Structure**, 4.5:
  https://docs.blender.org/manual/it/4.5/animation/armatures/structure.html
  The accessible English body text describes branched chains (fingers under a hand)
  and connected parent-tip/child-root relationships. Adaptation: ordinary Group
  links have exact endpoint parenting. This is not Blender's armature implementation,
  not its deformation solver, and introduces no Blender dependency.

## Test and result

`rigidChain` is a general-purpose construction convention over the locked
Three.js r186 Object3D hierarchy: local -Y lengths, parent-relative XYZ degree
rotations. Tests verify endpoint continuity under noncoplanar angles, immutable
inputs, callback ownership, serialization and unchanged geometry across poses.
The robot hand and a much larger opposed-jaw mechanical gripper demonstrate reuse.

The controlled render shows the hand cupped toward its palm instead of all digits
following one arc. The larger chest/thigh changes use the existing contour tool;
they are not evidence of a new topology or sculpting algorithm. Full-scene likeness
remains limited by broad body masses, simplified head and regular pack/cable shapes.
No authored shadow, shader or high-to-low normal transfer changed this pass.

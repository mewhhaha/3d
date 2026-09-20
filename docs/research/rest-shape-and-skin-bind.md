# Rest-shape editing and coherent skin binds

Accessed 2026-09-20. No videos, tutorial meshes or premium assets reviewed.

- Julien Kaspar, **3 - Full Body Sculpting**, Blender Studio:
  https://studio.blender.org/training/stylized-character-workflow/3-full-body-sculpting/
  The public written text available through search describes deliberately
  contrasting Snow's torso emphasis/shorter legs with Rain's longer-legged
  design, reusing existing hands, and keeping parts separate for resolution.
  Direct page opening returned 402; the video was not viewed. Adaptation: treat
  the imported base as a reusable starting point and test torso/leg proportion
  variants in plain views rather than multiplying armor detail.
- Blender Manual, **Lattice Modifier**:
  https://docs.blender.org/UATEST/manual/en/dev/modeling/modifiers/deform/lattice.html
  Indexed official written text describes one deformation shared by multiple
  objects and retention of UV coordinates. Direct fetch was unavailable. Our
  point-field operation uses that separation of shape from tessellation, but is
  not Blender's lattice implementation or a live modifier stack.
- Khronos, **glTF Tutorials: Skins**:
  https://github.khronos.org/glTF-Tutorials/gltfTutorial/gltfTutorial_020_Skins.html
  Read the accessible article. Inverse binds map rest vertices into each joint's
  space; current joint transforms then produce the posed result, blended by skin
  weights. This directly requires recomputing inverse binds when changing rest
  joint positions. The existing source animation cannot be claimed unchanged
  after such an edit. New poses are authored/solved AFTER refitting.

Implementation: one smooth field changes rest vertices and joint positions,
retains index/UV/weights, transports normals through the local Jacobian and
invalidates tangents/old detail correspondence. Imported Xbot and an independently
built flexible tail exercise it. Compare same-camera plain form-only, pose-only,
combined and T-bind views, then reimport complete posed skins. This is our
bounded engineering adaptation, not an automatic anatomical fitting algorithm.

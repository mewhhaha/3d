# Fitting a costume to the evaluated rather than raw body

Read 2026-09-21; written primary documentation, using installed Three.js r186.

- Three.js, **Mesh / getVertexPosition**:
  https://threejs.org/docs/pages/Mesh.html
  The documented method returns a local vertex with current morph and skin
  deformation included. Directly checked against the installed implementation.
  Decision: snapshot the evaluated skin in a chosen attachment frame; do not fit
  a posed costume to the raw T-pose position array.
- Three.js, **SkinnedMesh**:
  https://threejs.org/docs/pages/SkinnedMesh.html
  Skin indices/weights govern per-joint influence, while bind matrices and the
  current joint transforms determine evaluation. This explains why the previous
  rigid chest plate could not follow blended spine skin just by using one bone.
  The snapshot intentionally does NOT transfer those bindings to new geometry.
- Three.js, **Color Management**:
  https://threejs.org/manual/en/color-management.html
  Reconfirmed separate sRGB color textures versus non-color normal/roughness data.
  Reuse iris and hair-color maps plus the approved generated enamel/rubber samples;
  no painted purple texture is treated as a bake or reconstructed geometry.

Adaptation: pose-space surface snapshot plus a project-specific smooth polynomial
panel envelope. The polynomial fitting and conservative sampled lift are our
construction choices, not a Three.js or Blender algorithm. It is tested on an
armored imported torso and an independent flexible-tail guard. Source/bind
preservation, endpoint matrices, selected-pose evaluation, export images and
rigid motion are checked separately from likeness.

Blender's Shrinkwrap manual and the Blender Studio procedural-hair article were
attempted but returned 402, so no new technique is attributed to their text or
videos. The previously linked construction videos remain unreviewed.

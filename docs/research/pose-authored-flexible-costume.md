# Flexible costume authored in a pose

Accessed 2026-09-22; substantive written primary sources, not video content.

- Khronos, **glTF Tutorials: Skins**:
  https://github.khronos.org/glTF-Tutorials/gltfTutorial/gltfTutorial_020_Skins.html
  The tutorial describes current joint world transforms combined with inverse
  binds and weighted skinning. This directly informed inversion of each vertex's
  blended current deformation, rather than averaging separately inverted joints.
- Three.js, **SkinnedMesh**:
  https://threejs.org/docs/pages/SkinnedMesh.html
  The bind/skin matrix and vertex-evaluation contracts informed the isolated new
  skin and roundtrip checks. The installed r186 `skinnormal_vertex.glsl.js` uses
  a linear blended matrix for normal directions. Our inverse normal operation
  explicitly follows that version's convention, not an assumed normal bake.
- Three.js, **Color Management**:
  https://threejs.org/manual/en/color-management.html
  Color inputs and calculations have distinct encodings. Existing generated
  enamel color samples and authored contour pigment are multiplied in linear
  space and stored in an sRGB map; roughness remains non-color data.

The attempted Blender Studio Pose Polishing page returned 402. No technique is
attributed to unavailable text or video. The inverse-construction operation is
our bounded implementation, not an imported solver or tutorial asset.

Examples: the upright costume's flexible waist and an independent four-bone
appendage cuff. Tests check inverse positions/normals, shared immutable bind,
invalid blends, cloned geometry, texture ownership and actual GLB reimport.
An initial cuff intersected its source; its radii were revised after material
and side inspection. The final result remains a draft without collision or
physical-balance guarantees; see the checkpoint for measurements and rejections.

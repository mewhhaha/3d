# Actual Mixamo sample and preserved bind frames

Accessed 2026-09-20. Written primary sources:

- Three.js, **Skeletal Additive Animation Blending**:
  https://threejs.org/examples/webgl_animation_skinning_additive_blending.html
  The page explicitly credits the model to mixamo.com. Its repository supplies
  Xbot.glb; r186 resolves to 148ef33ecb6d2502ff796d4554abd1549c95d519. The downloaded
  blob is 3805d73e7c9cecef16f69dd0b0f1ce649f69c653, 2,930,032 bytes. This is an
  actual imported rig and mesh, not our original mannequin or a reconstructed
  screenshot. No authenticated Mixamo API or library browsing was performed.
- Adobe, **Mixamo FAQ**:
  https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
  The written FAQ says an Adobe ID is needed, no subscription is required, and
  characters/animations can be used royalty free in personal/commercial/nonprofit
  projects. Do not call the raw meshes CC0/MIT or build a redistributable library
  from that statement. Our optional cache is outside Git; final CI evidence has
  images/reports, not a raw or modified asset pack.
- Three.js, **SkeletonUtils**:
  https://threejs.org/docs/pages/module-SkeletonUtils.html
  `clone` associates cloned bones and skins but shares geometry/materials. The
  import study therefore clones those owned resources explicitly. Retargeting
  has separate mapping/bind options; this pass does not claim generic Mixamo
  animation compatibility. It authors pose holds on the actual imported rig.
- Installed Three.js **r186 Skeleton.pose implementation**:
  https://github.com/mrdoob/three.js/blob/148ef33ecb6d2502ff796d4554abd1549c95d519/src/objects/Skeleton.js
  Inspection confirms root-local reconstruction treats non-bone ancestry as a
  world root. A .01 Armature therefore broke our unconditional preview reset.
  Adaptation: restore captured source local TRS rather than infer it from inverse
  binds; keep geometry, bone hierarchy and inverse matrices unchanged.

Result: actual sample loaded, rendered and posed with reusable world-target
controls on its existing skeleton. The same controls work on an original
mannequin and a small rotated/scaled three-bone fixture. Full-vertex source and
GLB roundtrip checks distinguish verified skin preservation from visual pose
acceptance. See the checkpoint for commands, rejected trials and final numbers.
No video, tutorial asset or Adobe auto-rigger implementation was copied.

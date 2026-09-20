# Rigid costume and interpreted generated color samples

Read 2026-09-21. Written primary sources:

- Three.js, **Object3D**: https://threejs.org/docs/pages/Object3D.html
  The local/world matrix distinction and hierarchy attach operation separate
  authoring placement from parent-relative motion; nonuniform hierarchy scaling
  is a documented limitation. Adaptation: an explicit model-frame bone mount,
  compensating imported units and rejecting a sheared TRS decomposition. This
  preserves rigid shell shape without pretending it is smooth skinning.
- Three.js, **Color Management**:
  https://threejs.org/manual/en/color-management.html
  Color/emissive textures use sRGB; roughness/normal maps are non-color data.
  Adaptation: use only generated flat color crops as base color and keep authored
  roughness separate. A purple picture labelled normal is not accepted as a
  geometrically validated tangent-space map. Existing radial emission maps remain
  separately authored and geometrically shallow rather than projected photos.
- Blender bone-parenting manual was attempted, but direct access returned 402.
  No technique is attributed to unavailable text or video.

Tests/examples: imported upright costume and independent inspection-arm guard;
scaled-parent mount motion and ownership; exact pose/skin preservation; same-
geometry plain/textured comparisons; actual browser GLB reload including PNG
textures and rigid-part motion. The library remains on locked Three.js r186.
The generated board is user-approved concept work, not a replacement target for
cyber-android annotations. No tutorial asset or article content was copied.

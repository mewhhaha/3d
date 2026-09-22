# Automated refinement progress

## 2026-09-22 — flexible waist, thigh contours and material-only pigment

Base **09dea117e707d9bdf9a6bbdbdbbe03f1bfec6e3e**, exact locked tree verified.
The containing commit is this implementation revision. Earlier interrupted flow
work left images only; this resumes its direction from current source.

`skinInPose` builds an independent deforming part in a chosen pose, recovers its
bind geometry with explicit weights, and preserves the existing skeleton/binds.
New `flow` adds a flexible waist and revised thigh edges; `panelLines` reuses
color/roughness maps on selected exteriors without geometry changes. The same
inverse-construction operation skins a cuff on an independent tail. No new pose,
shader, normal bake, source raster, image generation or original-skin change.

Local doctor, **35/35 focused tests**, **45-recipe build**, actual runtime
regression passed (legacy hand still reports six warnings). Final review:
**9 cases / 34 images / 3 zero-warning GLBs**; real textured GLB reload checks
42,440 rigid/selected-waist vertex samples per pose (<3.994e-8 m), all tail
vertices (<1.987e-8 m), split-primitive topology and exact bind/preview isolation.
Full suite and whole-gallery bake not rerun. Fingerprint
`e7a5cfc94426806dc70e8b23c0a70889546d0372e045d7c38d09452b7e273014`.

Scene **90,610 -> 93,834 triangles**; pigment adds no triangles. Waist gap and
thigh rims improve locally; face/hair, source-body seams and simple backpack
still differ markedly. Rejected spiky thigh edges, flared waist and intersecting
cuff are recorded. Earlier multi-material export-check failure was corrected
without reducing coverage or weakening its tolerance.

[API](skin-in-pose.md) · [research](research/pose-authored-flexible-costume.md) ·
[full checks/rejections](checkpoints/2026-09-22-costume-flow.md).
Evidence: `renders/costume-flow-review/`, existing imported-model artifact.
Final-commit CI pending at checkpoint. No deployment/native Blender claim.
Next: socket-routed cable loops and circular backpack mass, not another pose edit.

Prior journal preserved verbatim in
[journal through 09dea117](checkpoints/automation-progress-through-09dea117.md).

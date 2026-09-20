# Automated refinement progress

## 2026-09-21 — rough armor on the actual upright base

Base **33c072f4b28f62e2f2f81cc2799e78ac768c6275**, exact current kit tree
`81c40ffbb6e5832806b35996db4ca61e3efbf65d` verified through GitHub. Discarded the
previous response's stale-kit direction, not newer source. The containing commit
implements the user's approved rough costume on the current tailored Xbot.

`mountOnBone` retains authored component meters and follows the existing bone,
with imported-unit and invalid-scale checks. Chest/hip and separate limb shells,
coarse feet, mapped optics, backpack and loops form an optional 71,300-triangle
study. All five poses, source skin buffers/binds and the corrected upright camera
remain unchanged. Plain/textured geometry is identical. Two tiny true generated
color crops are embedded via `indexedColorTexture`; no fake normal bake. An
independent inspection-arm guard demonstrates the same mount/material workflow.

Final local doctor, **28/28 tests**, **45-recipe build**, actual runtime regression
passed. Review **8 cases / 26 images / 3 zero-warning GLBs**; real browser reload
decodes eight embedded textures and verifies all 22,659 rigid costume vertices
in two clips (max 4.51e-16 m). Exact bind/posed export equality. Fingerprint:
`585f5d358b9fd286de10659333d2d5f5403e3df9cc4d2e07c2bf2b65782728bf` (280 files).
Full suite bounded at 180s after **192 passing subtests**, exit124; not full pass.
Legacy hand runtime fixture retains six warnings. New CI pending at checkpoint.

The first crude supports penetrated; rest sampling and contour boundaries improved
limbs. A close projected chest experiment broke in pose and was rejected. Current
chest/hip stand-off, slab feet, sparse back and absent face/hair are explicit
roughness. Earlier mixed-source/OOM review remains failed, final serialized rerun
passed. No likeness, collision/balance, native Blender or deployment claim.

[Workflow](bone-mounted-armor.md) · [research](research/rigid-costume-and-color-samples.md) ·
[exact checks/rejections](checkpoints/2026-09-21-rough-costume.md).
Evidence: `renders/armor-blockout-review/`; existing `imported-humanoid-review`
artifact gets PNG/JSON only. No raw/derived third-party mesh or original raster
in Git/Pages. Next: chest/iliac/foot fit in the unchanged upright pose.

Prior journal preserved verbatim in
[journal through 33c072f](checkpoints/automation-progress-through-33c072f.md).

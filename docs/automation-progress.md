# Automated refinement progress

## 2026-09-21 — upright torso fit, rough portrait/bob and shaped feet

Base **80ec5c538aebcee70f89a6cfd1598983e573f3fa**, exact kit tree
`a6deb7bfb70194f74ab3c67be967a51ccb4084ee` verified through GitHub. The containing
commit is the implementation revision. Current body/pose/camera preserved.

Added reusable `evaluatedSurfaceGeometry` for pose/morph-aware fitting in an
explicit frame. A smooth selected-pose panel fit replaces floating chest/hip
supports. The same operation fits an independent flexible-tail guard. Reused the
workshop portrait/bob with separate coarse resolution and a head-bone mount;
removed only the old 1,042 head faces with dependent face metadata invalidated.
Profiled soles/toe/instep shells replace slab feet. Prior defaults remain, use
`fit:true, head:true, feet:true` with `upright` in the existing armor study.

Local doctor; **35/35 focused tests**, **9/9 old form regressions**, **45-recipe
build**, actual **20-pass/view runtime regression** passed. New review **9 cases /
42 images / 3 zero-warning GLBs**; real browser image decode and all 34,426 rigid
vertices checked in two clips. Bind/posed export equality and all 67 bone matrices
in five clips are preserved. Full npm test was not rerun. Legacy hand's six
warnings remain visible. Final source fingerprint
`6cfac392b0ce719450e93b7478dae88fc3c6203e6554b2fc9bc24c2a77007f6d`.

Scene **71,300 -> 90,610 triangles**, with existing iris/hair color maps, no new
normal bake/shader or generated raster. Direct projection, high tessellation and
an over-conservative quadratic envelope were rejected in actual side views.
Final gaps remain approximate; the head seam, simple neck/abdomen/limbs and sparse
backpack still differ markedly from the reference. No collision/likeness claim.

[Workflow/API](posed-costume-fit.md) · [research](research/evaluated-costume-surfaces.md) ·
[exact checks, distances and rejections](checkpoints/2026-09-21-costume-forms.md).
Evidence: `renders/costume-forms-review/`; existing imported-model CI publishes
images/JSON only. New CI/Pages pending at source checkpoint. Next: waist/abdomen
and upper-thigh panel flow, then backpack/cable masses without re-posing the rig.


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

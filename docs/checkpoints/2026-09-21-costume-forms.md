# Upright costume: torso fitting, portrait/bob and shaped feet

Base main **80ec5c538aebcee70f89a6cfd1598983e573f3fa**, exact recovered tree
**a6deb7bfb70194f74ab3c67be967a51ccb4084ee**, verified with connected GitHub and
its current locked authoring kit. Base imported-model CI, including the original
rough armor review, passed. The containing commit is the implementation revision.
No stale robot snapshot or different pose was restored.

## Implemented

`evaluatedSurfaceGeometry` freezes an evaluated skin/morph mesh in an explicit
frame, for queries/fitting. It does not silently copy weights, UVs, normal maps,
authored normals/tangents or high/low correspondence. The original source is not
mutated. The costume uses a posed snapshot mapped back into each rigid owner's
rest frame, then fits smooth chest/iliac covers to it. This corrects the previous
assumption that a blended spine skin behaves like a single rigid bone.

The final project fitter uses a fourth-order height polynomial over ray samples
INSIDE the authored contour, a conservative sampled envelope and 9 mm projection-
direction clearance. The chest is shorter, and hip panels occupy smaller regions
with actual skin beneath them. It is an approximate selected-pose fit, not a
collision solver or nearest-surface retopology. Sources and limits are in
[the API](../posed-costume-fit.md) and [research](../research/evaluated-costume-surfaces.md).

The same snapshot/fitting approach places a rigid guard on an independently
constructed flexible tail at a selected bend. Its source is our existing tail
fixture, not another imported humanoid.

Reused the workshop portrait and rounded bob at lower per-chart resolution;
added explicit resolution options without changing old defaults. Mounted the
whole head on the existing imported head bone. Removed **1,042 source head
faces**, retaining all source position/normal/UV/weight attributes and inverse
binds, and explicitly invalidating old face-region/material-region metadata.
The authored portrait is rigid, not a new facial rig. It uses existing iris and
strand-color maps and standard PBR materials; no new custom shader or normal bake.

The feet replace the slab boxes with profiled orange soles, flexible uppers and
separate contoured toe/instep shells. They retain the previous -0.0805 m local
sole-bottom datum. New geometry is independently owned and rebuildable.

All **67 bone world matrices in all five clips** remain exactly unchanged.
Camera, light rig, bind proportions, source skin attributes and inverse binds
remain unchanged. Previous costume defaults and the detailed android are intact;
new optional study values are `fit:true, head:true, feet:true`, pose `upright`.

## Actual checks

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2/SwiftShader,
  virtual display; passed.
- `node --test tests/evaluated-surface.test.js tests/bone-mount.test.js tests/illustration.test.js tests/refit-skin-bind.test.js tests/skeleton-pins.test.js tests/skeleton-pose.test.js tests/local-render.test.js`: **35/35 passed**, including six new tests.
- `node --test tests/form-design.test.js`: **9/9 passed**, old guided-form and
  reference-landmark regression preserved. This does not score the new costume.
- `npm run build`: **45 recipes**, passed on final computational source.
- `npm run test:render`: **LOCAL_RENDER_OK**, 20 views/passes, freshness, export
  isolation and invalid-input/recovery checks. Its unrelated legacy hand still
  reports **six warnings**, not suppressed or attributed to this costume.
- `node scripts/review-costume-forms.mjs`: **9 cases / 42 images / 3 GLBs**, each
  with **zero validation errors and warnings**, complete exit 0. Fixed-camera
  before/fit-only/complete, three full-body material/clay/wire views, three
  portrait material/clay views, clean bind and two tail-guard states.
- All final cases share computational fingerprint
  **6cfac392b0ce719450e93b7478dae88fc3c6203e6554b2fc9bc24c2a77007f6d**.
- Real browser GLB reload decodes **12 embedded textures**. All **34,426 rigid
  costume vertices** compare under `upright` and `neutral`, max error <4.51e-16 m.
  All **1,050 guard vertices** compare exactly in its bend. This is rigid-part
  export verification, not a new all-skin motion/retargeting claim.
- Bind and posed-preview costume exports are byte-identical.
- Full `npm test` was **not** rerun this bounded pass; focused/regression results
  above are the local claims. Final-commit CI and Pages are separate statuses.

Scene **71,300 -> 90,610 triangles**, **41 -> 70 meshes**, **13 -> 23 materials**.
Added portrait and shaped boots account for real new geometry; density is not a
likeness score. Four added iris/hair color images occupy 832 KiB base RGBA8 before
mipmaps. The approved enamel/rubber samples and existing mapped signals remain.

Projected outer-surface gaps at fitting samples (meters, min/median/95th/max):
chest **.009/.01981/.02514/.03149**; Right iliac **.009/.02498/.03171/.04131**;
Left iliac **.009/.02492/.03164/.04121**. Chest 168 hits/0 misses, each hip 166
hits/2 misses. These are projection-direction fit-sample distances, not normal
clearance everywhere. Rims and other poses can still intersect or stand away.

## Inspected/rejected experiments

The original user reupload was available and visually inspected, not replaced by
the generated boards. No original raster or annotation changed in source history.
Material, clay, silhouette, wire, close-up and side/back render evidence is saved.

Rejected direct high-frequency projection followed source gaps/creases and tore
up the chest/hip outlines. Raising refinement from 2 to 4 increased the scene to
144,020 triangles without curing those folds; that version was discarded. A
quadratic envelope rendered cleanly but left excessive plate stand-off. A first
fourth-order trial extrapolated beyond actual hip coverage and produced thin
protruding wings. Smaller covered contour domains were retained after side-view
inspection. Trial sources and images remain in the external evidence bundle.
The foot's first upper-chart orientation was corrected before the final review;
its upward normals and sole datum have a regression test.

The retained version fills the missing face/bob and shoe silhouettes and improves
chest/hip seating. It is still a rough interpretation: the bob has a conspicuous
crown/curtain shading seam and overly regular fiber pattern; the face is small and
pointed; abdomen/limb armor is broad and incomplete; backpack and cables remain
sparse placeholders. The neck is still the source joint sphere. The added rigid
head and covers are not collision-safe in every historical pose. No exact likeness,
physical balance, native Blender appearance or whole-city-scene completion claim.

## Artifacts and next target

Evidence: `renders/costume-forms-review/`, earlier trial directories and
`renders/session/` logs. The existing imported CI adds this review, publishing
PNG/JSON only; no raw/derived Mixamo mesh is committed or published to Pages.
Final-commit CI pending at source checkpoint.

Next: the abdomen/waist and upper-thigh panel flow on this unchanged upright
foundation, plus more deliberate backpack/cable masses. Keep the head seam and
neck transition visible as defects; do not hide incorrect shapes with greebles.

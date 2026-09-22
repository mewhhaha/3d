# Flexible waist and thigh-panel flow

Base main **09dea117e707d9bdf9a6bbdbdbbe03f1bfec6e3e**, exact recovered tree
**adea68c0813c9db537ac4b020ed5d63a92336d30**, verified using the connected GitHub
kit. The containing commit is this implementation revision. Earlier flow-session
images survived but no source/patch was recoverable. This pass resumes their
unfinished direction from actual latest main, not an old costume snapshot.

## Implemented

New `skinInPose` inverse-skins new geometry authored in a selected pose using
explicit weights and the existing skeleton. It preserves source geometry,
clips and inverse binds. New tangent/detail correspondence is invalidated;
singular/poorly conditioned blends throw. It does not change the imported rig.

A three-owner flexible waist joins the rib/pelvis region, while new thigh
boundaries reduce the abrupt proximal horizontal cutoff. The separate
`panelLines` option reuses contour pigment and roughness maps on four thigh/shin
exteriors, multiplied with existing generated enamel samples in linear color.
No new reference raster, generation, shader or normal bake. Old defaults stay.

Independent reuse: a pose-authored cuff on the existing original four-bone tail.
Its weights follow the centerline, not rim UVs, so duplicated rim vertices agree.
Its bent and rest states share a single new bind mesh. This is not a second
humanoid disguised as a fixture. See [API](../skin-in-pose.md) and
[written primary sources](../research/pose-authored-flexible-costume.md).

## Actual local evidence

- `npm run doctor`: r186 / Chromium 144.0.7559.96 / WebGL2 / SwiftShader with
  virtual display; passed.
- `node --test tests/skin-in-pose.test.js tests/armor-pigment.test.js tests/evaluated-surface.test.js tests/bone-mount.test.js tests/refit-skin-bind.test.js tests/skeleton-pins.test.js tests/skeleton-pose.test.js tests/local-render.test.js`:
  **35/35 passed**, including seven new inverse-skin/pigment tests.
- `npm run build`: **45 recipes**, exit 0.
- `npm run test:render`: **LOCAL_RENDER_OK**, exit 0, 20 views/passes and existing
  freshness/pose/export regression. Its unrelated legacy hand retains six
  validator warnings; these were not suppressed.
- `node scripts/review-costume-flow.mjs`: **9 cases / 34 images / 3 GLBs**, all
  zero errors/warnings; informational unused attributes remain. Full final run
  exit 0 with `COSTUME_FLOW_REVIEW_OK`. No full `npm test` or whole-gallery bake
  rerun in this bounded pass.
- Final computational fingerprint:
  `e7a5cfc94426806dc70e8b23c0a70889546d0372e045d7c38d09452b7e273014`.
- Every one of 67 bone world matrices in all five clips is unchanged. The two
  original skin vertex/normal/UV/weight/index arrays and inverse binds are exact.
  Plain/pigment geometry and silhouette PNGs are identical. Bind/posed-preview
  exported GLBs are byte-identical.
- Actual browser reload decodes **20 textures** and verifies rigid geometry plus
  the explicitly selected new waist skin in `upright` and `neutral`. Including
  repeated multi-material primitive buffers, **42,440 vertex samples per pose**,
  max error **3.994e-8 m**. Split primitives' concatenated indices also match.
  This is not a fresh all-source-skin deformation claim.
- Independent tail reload checks all **3,374 vertices** in bend/rest, max error
  **1.987e-8 m**. New waist has 1,654 vertices, minimum sampled blended determinant
  **.9793925**, maximum Frobenius condition **3.000145**. Those are numerical
  conditioning checks, not appearance or collision scores.

Full costume **90,610 -> 93,834 triangles**, **70 -> 71 meshes**. Plain new
construction has 23 materials; pigment adds four materials and eight 128x128
RGBA8 maps (512 KiB before mipmaps). New pigmented variant has 75 primitives.
This is a construction cost, not a performance win or likeness measurement.
The unchanged baseline PNG SHA is
`8ca1a4c97b196607a62776546baf159449695deba9f4057a1cdacd6484f8b2cb`.

## Inspection and rejected work

Opened final material, clay, wire, front/side/back and cuff images. The waist
no longer has an open central gap; thigh rims and pigment give the lower armor
more readable boundaries. Whole-character likeness still remains poor. Source
rib/pelvis overlaps and waist seams are still visible; face/bob, chest and limbs
remain simplified. The edge-on backpack and open-ended parallel cable loops
remain particularly unlike the target. Do not disguise this as a finished scene.

Rejected thigh top near v=.98 encountered poor fit samples and produced spikes;
retained a bounded .85 contour instead. A wider waist envelope created a flared
hem and a source-body patch; retained narrower geometry and a matching underlying
material. The first independent cuff penetrated its source on the side. Revised
its radius and placed its UV seam at the rear, then reran the complete review.
The prior successful-but-visually-rejected review stays separate from the final.

One earlier review failed because GLTFLoader splits multi-material meshes into
primitive groups. Corrected the checker to verify every primitive and full
concatenated topology rather than ignore them or loosen thresholds. That failed
report is preserved. No partial failure was renamed as success. Trials/logs and
final evidence remain outside Git under `renders/`.

The original uploaded reference was available and inspected; the generated NEXUS
image was not used as a replacement. Reference annotations and their uncertainty
remain unchanged; no optical annotations are scored as bare anatomical joints.
No raw Adobe/Mixamo input or derived mesh enters public Git or CI artifacts.

## Save / next

Existing imported-model CI runs this review with PNG/JSON artifacts only. No
permissions, concurrency or security settings change. Final-commit CI/Pages are
pending at this source checkpoint. Base imported/local-studio/Pages passed; its
long guided-form run was cancelled. No new native Blender claim.

Next concrete modeling target: route the backpack's loops between actual named
sockets and establish its circular carrier volume, keeping upright pose/camera
fixed and the broad form separate from high-frequency surface detail.

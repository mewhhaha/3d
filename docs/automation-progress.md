# Automated refinement progress

## 2026-09-16 — local-pivot portrait proportion pass

Base remote revision: `a318c99701a3c0618c4b50eaeec907a41f3a2ccf`.
Active recipe: `models/cyber-form-study.js`.

### Accepted changes

- Extended `weightedTransform()` with an optional local `pivot`. Broad form scales can now occur around an authored construction point instead of the scene origin, while retaining the existing scalar weight and offset semantics.
- Used the pivoted field on the portrait lower face to shorten the overly pointed chin without materially dragging the mouth or eye band. The field starts below the mouth and reaches full strength only at the chin tip.
- Kept the existing hair support, reference annotations, pose, camera and limb dimensions unchanged.

### Rejected experiment

- Tested a pre-tessellation crown contraction intended to round the broad top opening. Neutral renders were only marginally better and independent normal-transfer checks regressed badly: fringe baked maximum error rose from the prior single-digit tail to more than 18 degrees (and stronger variants reached higher). The trial was discarded rather than trading a small silhouette change for a worse low/baked representation.

### Evidence

- The exact original raster is still not present as a standalone file in this workspace; visual comparison used the previously saved private comparison derived from the supplied original. Public annotations were not changed.
- `npm run doctor` — WebGL2 / Chromium / SwiftShader available.
- `node --test tests/shape-rails.test.js tests/form-design.test.js tests/region-mask.test.js tests/compact-geometry.test.js tests/cyber-mechanics.test.js tests/contour-volume.test.js tests/render-batch.test.js` — **31/31 passed**.
- `npm run build` — passed, 15 recipes built.
- `node scripts/measure-reference.mjs models/cyber-form-study.js` — **9.3566575468 px RMS**, **17.9592707268 px maximum**, unchanged from the accepted pose.
- Head review: front, side and three-quarter material/clay renders completed at 600x700.
- Full fixed-camera cage hero completed at 640x1147 with **527,552 triangles**. An earlier baked+GLB attempt hit a Chromium page-closed termination and was not counted as validation.

### Visual assessment

The chin no longer ends in the previous needle-like point, so the face reads closer to the reference's shorter lower-face proportion while preserving the established look-back pose. The hair crown remains too angular/planar and the facial topology is still simplified; the eye and lip surfaces remain separate attachments rather than integrated facial topology.

### Next target

Keep the pose/camera/reference fixed. Revisit the crown through a support change that does not create a normal-bake tail regression, or strengthen one of the remaining large silhouette masses (outer shin/knee stack) before adding small decorative parts.

## 2026-09-16 — knee / boot articulation and representation-budget pass

Base remote revision: `5eef4900b717278b349100b6510f1b40c4008e75`.
Active recipe: `models/cyber-form-study.js`.

### Accepted changes

- Made `armorLeaf()` and `segmentedArmor()` tessellation an explicit construction option instead of a hidden fixed `[18,32]` grid. Segment counts now live with the representation, while the shared support and authored boundary curves continue to define shape. Individual leaves may override the set default.
- Retessellated thigh/shin shells to `[12,20]`, small flex bridges to `[10,12]`, and knee bracket patches to `[10,14]`. This restores scene budget headroom without changing the accepted pose, camera, limb dimensions or annotated feature targets.
- Added asymmetric inner/outer knee ears and receivers on the same thigh/shin supports. They interrupt the smooth circular-joint transition without introducing detached world-space coordinate tables.
- Reworked the boot upper into separate outer/inner toe petals with a dark center channel, asymmetric instep leaves, and unequal ankle-cuff windows. The closed toe bumper and section-lofted sole remain independent parts.
- Hardened the finite render batch against one observed Chromium failure mode: only a `Target page/context/browser has been closed`-class termination receives one fresh-session retry. Ordinary render, geometry, validation and budget failures are never retried.

### Evidence

- The exact original raster was not available as a standalone local file in this run. Visual inspection used the previously saved private reference comparison derived from the supplied original; public reference annotations were left unchanged.
- `npm run doctor` — WebGL2 / Chromium / SwiftShader available.
- `node --test tests/form-design.test.js tests/shape-rails.test.js tests/region-mask.test.js tests/compact-geometry.test.js tests/cyber-mechanics.test.js tests/contour-volume.test.js tests/render-batch.test.js` — **31/31 passed**.
- `npm run build` — passed, 15 recipes built.
- `node scripts/measure-reference.mjs models/cyber-form-study.js` — **9.3566575468 px RMS**, **17.9592707268 px maximum** over the same nine observed feature points, unchanged from the accepted pose.
- Final cage/baked assembly: **527,552 triangles**, down from the preceding CI review's **601,312**. High evaluated hair assembly: **650,432 triangles**. These are below the unchanged form-study limits of 600,000 low/baked and 750,000 high; the limits were not raised.
- Final full-scene cage GLB from `renders/run4-hero-final/` validates with **0 errors / 0 warnings**. The isolated boot renders at **21,324 triangles**.
- The preceding commit's form-study CI had 33/33 targeted tests pass but then failed because low/baked/survey exceeded 600,000 triangles and one high render lost its Chromium page. This pass addresses both causes directly rather than relaxing acceptance criteria.
- `npm run review:forms` — **passed end to end** after the changes. All four fixed-camera variants passed their unchanged budgets and GLB validation, clean preview/export isolation passed, full hero/depth/head/boot captures completed, region-mask/reference diagnostics completed, surface/cache checks passed, and all three standalone hair exports validated.

### Visual assessment

The knee transition now has separate asymmetric clamp-like masses around the circular bearing instead of only a smooth shell ending at a glowing disk. The boot has a visible dark center channel and independent toe/instep/cuff plates, reducing the single-piece sneaker reading. The fixed-camera hero still shows a much cleaner lower body than the reference: outer-shin layering is sparse, knee brackets are subtler than the artwork's dense stack, and the boot sole/toe silhouette remains too regular.

The head/hair crown and simplified face remain larger full-character likeness errors than any lower-leg micro-detail. No small greeble pass should precede those primary forms.

### Next target

Keep the pose, camera and annotations fixed. Either strengthen the outer-shin/knee silhouette with a few larger connected bracket forms, or return to the crown/head cross-section. Prefer a small number of structural volumes over decorative density.

## 2026-09-16 — shoulder / reactor carrier pass

Base remote revision: `5fdb4bddb051ca8f2018c1c0dd52a48a9d27eee1`.
Active recipe: `models/cyber-form-study.js`.

### Accepted changes

- Added `radialArray()` to the cyber mechanics vocabulary. It places owned modules in a stable local annular frame and exposes radial/tangent directions without baking placement into each child mesh.
- Added a nested structural carrier around the existing main backpack reactor: independent inner/outer rings, six radial braces, and twelve alternating carrier lugs all compose in the reactor's existing local frame. The pre-existing cooling cartridges are retained rather than replaced.
- Recessed the spherical shoulder joint cores and enlarged/profiled the ceramic shoulder cowls, preserving the shoulder centers and arm mounts while making the shell rather than the black ball define more of the outer shoulder silhouette.
- Added per-loom `emissiveScale` and `opacity` controls. Each loom clones its emitter materials so look-development changes remain local. The reference power loop now uses four thinner, closer, partially transparent strands with lower emission instead of three broad opaque tubes.

### Evidence

- Original reference recovered from the prior private checkpoint and hash-checked: `127f0f4216b12e279f01c77206720feb4e76ab989b7ed92576505faa4f329218`.
- `npm run doctor` — WebGL2 / Chromium / SwiftShader available.
- Targeted geometry/mechanics suite: `node --test tests/cyber-mechanics.test.js tests/form-design.test.js tests/shape-rails.test.js tests/region-mask.test.js tests/compact-geometry.test.js tests/contour-volume.test.js` — **26/26 passed**.
- `npm run build` — passed, 15 recipes built.
- `node scripts/measure-reference.mjs models/cyber-form-study.js` — 9 feature points, **9.3566575468 px RMS**, **17.9592707268 px maximum**, unchanged from the preceding pose alignment.
- Cage-hair scene export after this pass validates with **0 GLB errors and 0 warnings**. Informational unused-UV messages remain.
- Fixed-camera hero comparison: `renders/automation-backpack-before/hero-material.png` versus `renders/automation-backpack-final/hero-material.png`. Reactor material/clay close-ups are in `renders/automation-shoulder-after/`.

### Visual assessment

The main reactor no longer reads as a single clean neon disk floating inside a sparse hoop: the carrier rings, braces and lugs give it a larger mechanical mass closer to the supplied artwork. The shoulder shell covers more of the joint and the black spherical core is less dominant. The hanging power loop is no longer blown out into three three thick opaque strokes; its four colored cores remain individually visible through overlapping sections.

The pack is still much cleaner and more radially symmetric than the reference, which has more irregular manifolds, hose crossings and asymmetric brackets. The head/hair crown remains angular, the face is simplified, and the thigh/shin/boot armor is still smoother and less layered than the reference. No pose, camera, reference annotation or limb-length change was made.

### Next target

Keep pose, camera and annotations fixed. Refine the pelvis-to-thigh and knee-to-boot armor transitions, or return to the head/hair crown if those primary silhouettes dominate the next fixed-camera comparison. Prefer a few connected layered shells and exposed chassis paths over decorative surface noise.

## 2026-09-16 — torso silhouette pass

Base remote revision: `2e5a30a88fcb46bce0a7eb1004ba145e34cc3928`.
Active recipe: `models/cyber-form-study.js`.

### Accepted changes

- Extended `contouredShield()` with resolution-independent `widthProfile` and `centerProfile` curves. Both the dark substrate and ceramic face continue to derive from one support, so silhouette edits do not duplicate layer coordinates.
- Replaced the round pectoral shields with narrower, flatter leaf profiles biased away from the sternum. Shoulder and clavicle shields also use explicit longitudinal profiles instead of the same generic oval.
- Narrowed only the unscored thoracic/abdominal understructure behind those shells; pose anchors, limb lengths, camera, reference annotations and named scored feature origins are unchanged.

### Evidence

- `npm run doctor` — WebGL2 / Chromium / SwiftShader available.
- Targeted geometry suite: `node --test tests/form-design.test.js tests/shape-rails.test.js tests/region-mask.test.js tests/compact-geometry.test.js tests/contour-volume.test.js` — **22/22 passed**.
- `npm run build` — passed, 15 recipes built.
- Full `npm test` was attempted within the bounded run and reached test 70 with no failures before the command timeout; this is **not** recorded as a repository-wide pass.
- `node scripts/measure-reference.mjs models/cyber-form-study.js` — 9 feature points, **9.3566575468 px RMS**, **17.9592707268 px maximum**, unchanged from the preceding pose alignment.
- Fixed-camera local comparison renders: `renders/automation-torso-before/` and `renders/automation-torso-after/` contain front/side/three-quarter material and clay captures; `renders/automation-hero-torso/hero-material.png` is the full hero after the accepted edit.

### Visual assessment

The upper torso now exposes the narrow black mechanical core and rib structure instead of reading as two large ivory domes. In material and clay three-quarter views the ceramic chest leaves occupy less projected area and sit flatter, which is closer to the supplied reference's segmented chest treatment. The shoulders remain too smooth and spherical, the backpack is still much less mechanically dense than the reference, and the large luminous loop remains too opaque/bright. The head/hair crown and simplified face also remain visible likeness errors.

### Next target

Keep pose, camera and annotations fixed. Refine the shoulder/backpack mass relationship and reactor support structure, or reduce the luminous loop's visual weight while preserving its socket endpoints. Do not compensate by adding random greebles; establish the large mechanical forms first.

## 2026-09-16 — portrait primary-form pass

Base remote revision: `76b110c7ca5f820994e2873eb51170be6adb62c9`.
Active recipe: `models/cyber-form-study.js`.

### Accepted changes

- Added `weightedTransform()` to `src/lib/shape-deform.js`: a resolution-independent scalar-field blend for local scale/offset edits. It rejects invalid weights and leaves source points untouched.
- Replaced the portrait's earlier asymmetric lower-face pull with symmetric, broad jaw/cheek transforms. The concealed scalp reduction and small nose-plane correction remain local mesh edits; named feature origins, pose, camera and reference annotations are unchanged.
- Rejected an experimental crown-cap rewrite after neutral/material renders showed a new visible top ridge; it is not part of this checkpoint.

### Evidence

- `npm run doctor`: WebGL2 / Chromium / SwiftShader available.
- Targeted geometry suite: `node --test tests/form-design.test.js tests/shape-rails.test.js tests/region-mask.test.js tests/compact-geometry.test.js` — 18/18 passed.
- Full `npm test` was attempted twice but did not complete within the bounded local execution window; both attempts reached test 83 with no failures before timeout. This is not recorded as a repository-wide pass.
- `npm run build` — passed, 15 recipes built.
- `node scripts/measure-reference.mjs models/cyber-form-study.js` — 9 feature points, 9.3566575468 px RMS, 17.9592707268 px maximum. This matches the prior pose-alignment value to displayed precision; the pass is a shape change, not a pose correction.
- Fixed-camera renders inspected locally: `renders/automation-head-face/{front,side,threequarter}-{material,clay}.png` and `renders/automation-hero-face/hero-material.png`.

### Visual assessment

The lower face is no longer pulled sideways by a portrait-space deformation and reads more consistently from front, three-quarter and hero views. The face is still simplified: the chin remains too sharp, eye/lip attachments are separate surface geometry, and the head/hair crown is still too angular compared with the supplied reference. The broad chest/shoulder armor and luminous loop remain larger likeness errors than facial micro-detail.

### Next target

Keep the pose, camera and annotations fixed. Refine one primary mass next: either soften the crown/head cross-section without introducing a cap ridge, or reshape the chest/shoulder armor boundaries and depth. Do not add decorative density before those forms improve.

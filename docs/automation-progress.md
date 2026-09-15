# Automated refinement progress

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

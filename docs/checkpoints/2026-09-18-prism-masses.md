# Primary humanoid mass pass — 2026-09-18

Base main **35bdce30e1a07cc70ba357a9f2dde9fd924df8f9**, tree
`f03970d3f33825485dee34afee568ff47fba9511`, was read through connected GitHub.
Its six workflow runs, including form study and Pages, have succeeded. The exact
source and locked dependencies were recovered from its authoring-kit artifact
10521775142. The previous `/mnt/data/currentrepo` local-only edits were on an older
snapshot; they were not merged or used to replace newer limb/pose/head work.

## Accepted scope

The containing commit extends `radialMass.angle` to a longitudinal direction
function, and adds optional `massStyle: sculpted` robot supports. Existing scalar
angle behavior, scene defaults, reference annotations, head, camera, rigid poses,
limb lengths, wrist/ankle targets and planted boots stay intact. New directions
shape broad quads, offset calf heads, forearm groups and rib/waist/pelvis volumes.
A narrowing shoulder mantle replaces the visual dependence on an exposed ball.
All armor contours and attached ports continue to sample shared shape supports.

This is not a new skeleton, skin simulation, normal bake or anatomy reconstruction.
The unrelated spiral grip exercises the same library extension with a different
purpose and different dimensions. Its ferrules remain rigid and fixed.

## Exact local evidence

Working tree: `/mnt/data/prism-anatomy`. Final review fingerprint:
`13266e51763005ee0e0c449e28f905ab8490c702c7512029d33f8d7ff8e5c9ba`, 218 source
files, identical across all eight cases. `sourceRevision` in the local manifests
is null; the exact published code is identified by the containing Git commit plus
this source fingerprint, not a guessed remote SHA embedded before commit creation.

Commands actually completed:

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2 / SwiftShader / Xvfb.
- `node --test tests/mass-forms.test.js tests/structure-forms.test.js tests/prism-torso.test.js tests/prism-limbs.test.js tests/prism-gesture.test.js`: **19/19 passed**.
- `node --test --test-name-pattern="^cyber-form-study:" tests/models.test.js`: **1/1 passed** (default, deterministic bounds, parameter limits).
- Expanded compatibility run adding `tests/form-design.test.js` and `tests/refine-forms.test.js` to the focused list: **30/30 passed**.
- `npm run build`: **44 recipes**, passed.
- `node scripts/review-masses.mjs renders/mass-review`: **8 cases / 44 renders**,
  **3 GLBs with 0 errors / 0 warnings**. Validator informational messages remain
  in validation.json, not suppressed.
- `timeout 180 npm test`: **165 passing subtests, no reported failures**, then
  exit 124. This is not a completed repository-wide local-suite pass.

Full scene: **643,084 -> 658,572 triangles**, **647,604 -> 661,764 vertices**.
The increase is the separately owned shoulder mantle geometry, not increased
resolution of the limbs. Isolated legs keep **177,264 triangles / 146,204 vertices**;
both grip variants keep **16,576 triangles / 9,397 vertices**.

Landmark errors are unchanged: **9.8003344814 px RMS / 25.9151421421 px max**. Those
nine landmarks do not certify anatomy, silhouette or likeness. Endpoint agreement,
periodic support seams, outward normals, independent ownership and pose/boot
invariance have explicit new tests. No old test was relaxed.

## Images inspected

`renders/mass-review/hero-comparison.png`, `body-comparison.png`,
`legs-comparison.png`, plus isolated side/clay/wire and grip material views.
The before/after cases use identical cameras and lights. The actual reuploaded
reference was visually inspected privately; its encoding is not asserted to match
the historical SHA. No reference raster is committed.

The shoulder now narrows into the upper arm instead of displaying a bare sphere
behind a cowl. The hips/thighs and offset calves have better mass transitions, and
the upper rib envelope is less barrel-like. The change is substantially clearer in
clay close-ups than in the full neon view. The face, hands, overlarge smooth shell
regions and mechanical pack remain far simpler than the reference. This is a modest
form improvement, not a likeness match or aesthetic acceptance by an automated score.

An initial ownership test incorrectly looked up duplicate ring names. It failed;
we fixed the test to pair deterministic traversal order and still require exact
matching names/index/position arrays and independently owned geometry. We did not
ignore it or weaken an old regression. No additional rejected visual variant was
promoted. The prior local-only blanket slimming pass remains isolated.

## Research / next step / CI

[Research notes](../research/humanoid-mass-groups.md): Proko's written Robo Bean and
shoulder lessons, plus Blender's published volume-brush description, informed mass
hierarchy and taper. We read public text, not inaccessible videos or paid lessons.
The adaptation uses analytical radial shape fields, not Blender brush code.

Component CI is pending at this checkpoint and will exercise this review. Its result
is distinct from Pages deployment, external PBR fallback appearance and native
Blender validation. Next: revise the broad chest/thigh ceramic boundaries around
these envelopes and improve relaxed hand silhouette, rather than adding tiny
surface details to hide incorrect forms.

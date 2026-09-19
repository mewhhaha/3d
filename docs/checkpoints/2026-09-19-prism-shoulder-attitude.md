# Anchor-preserving shoulder module attitude

Base main **a427bd99979c67285db1afe83fbb720e5178879a**, exact locked kit/tree
`722017fa182173be8c3d1d8fd807be165fcbf828` verified through connected GitHub.
The containing commit is this pass's implementation revision. The newer
connected girdle was preserved rather than duplicating the previous visible
conversation checkpoint.

## Implemented

`aimAroundAnchor()` swings a rigid local axis toward a world/parent direction
and compensates translation to retain an arbitrary object-local anchor.
No mesh buffer, material, scale or child-local transform changes. It works
through positive nonuniform/sheared ancestor transforms, validates TRS and
uses shortest parent-space swing rather than a camera-dependent billboard.
[API](../assembly-aim.md), [sources](../research/anchored-module-attitude.md).

Optional `shoulderStyle: seated` with the connected articulated girdle swings
only each optical module and cowl. Existing port centers, arm pose and shoulder
balls stay fixed. The two intended directions are authored world-space design
choices, not estimated camera-facing normals. Rebuilt sleeves span exact
analytic shoulder-ball circles to the newly aimed lens back rings. A local
axial clearance fit keeps cowl samples in front of the retained sphere, while
preserving the in-plane aperture coordinates. This is not generic collision,
skinning, topology welding, or a recreation of Blender's shrinkwrap operator.

The unrelated inspection instrument uses a lower, off-origin ball-seat anchor
and a different direction/scale. Its housing, readout and lens swing together
without rewriting their geometry. Same 3,060 triangles in both configurations.

All old defaults remain unchanged. No reference annotations, camera, pose
origins, limb lengths, head, hand, foot, reactor, light, texture or normal-bake
changes. Optical maps and emitter mesh data are unchanged. Fitted cowls and
sleeves are fresh standard-material geometry with UVs; prior correspondence is
not claimed for reconstructed cowls. The head's existing PBR-export fallback
remains unchanged.

## Actual checks

- `npm run doctor`: passed with Three.js r186, Chromium 144.0.7559.96, WebGL2,
  SwiftShader, virtual display.
- `node --test tests/assembly-aim.test.js tests/prism-shoulder-seat.test.js`:
  **6/6 passed**.
- `node --test --test-concurrency=1 tests/assembly-aim.test.js tests/prism-shoulder-seat.test.js tests/prism-girdle.test.js tests/bridge-surface.test.js tests/section-shape.test.js tests/prism-gesture.test.js`:
  **21/21 passed** in the final fully observed invocation.
- `timeout 130 node --test --test-name-pattern='cyber-form-study' tests/models.test.js`:
  **1/1 passed** in 62.95s (default, deterministic bounds, parameter limits).
- `npm run build`: **44 recipes**, passed.
- `node scripts/review-shoulders.mjs`: **6 cases / 42 renders / 3 GLBs**, all
  **zero validation errors and warnings**. Hero material/clay/silhouette;
  four girdle views in material/clay/wire; two instrument views in those passes.
- All final review cases share source fingerprint
  `07642c022b812975c2e39a0a074a47ae0a33214808ac5c378ca2c80108447050`
  over **242 computational files**.
- `timeout 180 npm test`: exit **124**, **171 passing subtests**, no reported
  failure before the bound. This is not a complete full-suite pass.

Two initial broader-test tool invocations were cut off by the container's
short execution limit, not failed assertions. The retained finite-process
invocation completed. An initial 110-second targeted model invocation run
alongside the full suite also timed out; its isolated rerun above passed.
No tests were weakened and no warnings suppressed.

## Measured scope

Scene before/after: **636,428 -> 638,388 triangles**, **629,110 -> 630,814
vertices**, **919 -> 921 primitives**, **50 materials** unchanged. Two thin
support sleeves account for added geometry. Resolution is not likeness quality;
no frame-rate or memory improvement is claimed. Isolated girdle goes from
206,312 to 208,272 triangles.

Tests verify preserved pose/world transforms and guide data, unchanged
head/hand/foot/torso/leg buffers, unchanged emitter buffers and centers to
<1e-12. New axes align within numerical tolerance. Compiled sleeve outer end
vertices match sphere/back-ring constraints within 1e-7. The sampled cowl
vertices clear the shoulder core; this is not an all-triangle collision proof.

Reference landmarks remain **9.8003344814 px RMS / 25.9151421421 px maximum**.
Hero silhouette overlap with the previous render is **0.9919658317**, foreground
mean absolute RGB change **0.0116285095**. These compare renders, not reference
likeness. The reupload was visually available and inspected; encoded SHA
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`
differs from the historical original-file hash. No reference raster is in Git.

## Visual inspection and rejected trials

Near shoulder optics are less edge-on and now read as a seated disk in the
hero view. Actual side/back clay inspection shows the retained structural
bridges and the new lens supports. The original re-aim trial let the shoulder
sphere protrude through the cowl as a dark crescent. Narrowing the sleeve alone
did not fix it. Both trials were rejected; the accepted sphere-clearance fit
was then inspected in the full fixed-camera review. Trial source, patches and
images remain in the evidence bundle, not working defaults.

The whole scene is still far from the illustration. The far shoulder position
is too lateral, the torso has too much smooth uninterrupted surface, the
head/eyes and hair are simplified, and the pack/cables remain regular. Re-aiming
optical modules does not solve those structural discrepancies. This pass does
not claim a new anatomical pose or a major whole-image likeness jump. Separate
sleeves/cowls are not a single watertight or contact-simulated assembly.

## CI / next work

Base independent girdle, primary, foot and signal jobs passed. Base long
combined form job was cancelled at its last hand review after preceding stages
succeeded. Local-studio and pose CI succeeded. New independent `shoulder-study`
job tests/renders/exports and uploads `shoulder-attitude-review`; final-commit
CI and Pages are pending at this source checkpoint. No native Blender
appearance is claimed for the new variant.

Evidence: `renders/shoulder-review/review.json`, case images/GLBs,
`hero-comparison.png`, `body-comparison.png`. Keep bulky results out of source.
Next: reconsider the far shoulder and chest depth together with connected arm
solving, rather than moving the optical center alone or adding painted detail.

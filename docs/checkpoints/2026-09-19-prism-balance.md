# Shared rib pose, far-arm plane and proximal thigh covers

Base main **a0283a772394605e56159e04ad89ce81b4c6964d** and exact locked tree
`48d4511a3f52c26c2340479a4e686f3301b8bf53` verified via connected GitHub.
API checkpoint **43d052c9ea8e1013a98f5a2d040dab3576bf65a2** was pushed during
this run. The containing scene commit is the completed implementation revision.
No stale source kit was promoted.

## Construction and uncertainty

`twoLinkPose({jointPlane})` intersects the fixed-length bend circle with an
explicit plane. The pole chooses between branches; incompatible planes fail
rather than stretching or clamping the requested pose. See
[API](../two-link-plane.md) and [sources](../research/joint-plane-and-pelvic-overlap.md).
The same operation drives an unrelated unequal-link service boom.

Optional `gestureStyle: poised` is a substantial, still-experimental pose
hypothesis. It brings the far shoulder forward and down, fits the SAME rib
section to both shoulder sockets, then re-solves the far arm back to its fixed
wrist target. The new joint plane limits elbow spread. The near shoulder is
explicitly pinned to its previous evaluated coordinates; retaining that exact
sample avoids floating-point re-evaluation changing its fitted optical seat.
The resolved rib station is reused by torso geometry and the rebuilt girdle.
Both sockets remain on opposite sides in their resolved rib frame.

This is NOT a measurement of occluded anatomy. The reference's small green
module is visually ambiguous and is not a manually annotated far-shoulder
landmark. The more visible compact green far module is an artistic hypothesis,
not a proven identification. Its existing radial-map construction is reused.

Optional `panelStyle: swept` extends the ceramic-bearing proximal thigh surface
by .036 m, narrows its midsection and reshapes the pelvic apron. It does not
lengthen a bone. Knee end rings, leg poses and planted feet remain fixed.
Previous defaults and all observational annotation files remain unchanged.

## Actual checks and scope

- `npm run doctor`: Three.js r186 / Chromium 144.0.7559.96 / WebGL2 / SwiftShader;
  passed.
- `node --test --test-concurrency=1 tests/two-link-plane.test.js tests/poised-form.test.js tests/two-link-pose.test.js tests/prism-gesture.test.js tests/lookback-style.test.js tests/prism-girdle.test.js tests/prism-shoulder-seat.test.js`:
  **25/25 passed**, including eight new tests, on final code.
- `timeout 240 node --test --test-name-pattern="cyber-form-study" tests/models.test.js`:
  **1/1 passed** (default/determinism/parameter limits), final run 206.3 seconds.
- `npm run build`: **44 recipes**, passed after the final numerical pin fix.
- `node scripts/review-balance.mjs`: **8 cases / 42 rendered images / 3 GLBs**,
  each **zero validation errors and warnings**. Includes previous, pose-only,
  swept/outlined, PBR coating, three body views and the independent boom.
- Final computational source fingerprint:
  `a2c418ac8e72c35342583b01a876f4b8806089d1d8c286f7310071745b91fcce`
  over **248 files**. No reference raster is in that source tree.
- A complete `npm test` run was not performed this pass. The completed targeted
  model test must not be presented as a whole-suite or deployment pass.

All full-scene cases retain **638,388 triangles / 630,814 vertices / 963
primitives / 92 materials**. No new shader, detail texture or normal bake.
Existing pigment and two-tone shading are separately reviewed; external GLB
viewers receive the documented PBR fallback. Changed support geometry generates
fresh normals; no previous tangent-space bake is claimed for it.

Tests preserve camera, all link lengths and hand/ankle targets, near-arm/head/
leg/foot buffers and unchanged placement to numerical tolerance. The far arm
and rib geometry deliberately change. Analytic girdle endpoint contact is not
proof of collision-free shells. The original manual landmarks omit the far
shoulder/elbow; unchanged near-landmark error is not evidence this interpretation
is anatomically correct. Reference reupload SHA is
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`, not the
historical original-byte hash. It was available and visually inspected.

## Visual judgment, rejected trials, remaining defects

The far-side arm now reads separately from the ribs, and the proximal thigh
covers no longer begin as abruptly below the hip sockets. The whole-image
change is visible, but the new rib inclination is aggressive and remains a
candidate rather than a finished confident/anatomical pose. Side clay still
shows a pinched rib-to-neck region, broad pelvic mass and simplified open-ended
limb cores. The head/hair, lower-leg proportions, armor silhouettes and cable
routing remain substantially unlike the illustration.

Rejected: an outflung elbow; an unreachable joint-plane trial (correctly threw);
.055 m thigh extension with excessive overlap; isolated forward shoulder motion
that crossed an unchanged rib cage. The latter was replaced by the shared-rib
fit, not hidden behind shading. A new buffer-equality test caught tiny fitted
near-cowl differences; the original near socket was pinned explicitly and the
exact geometry-buffer assertion retained. Old tests were not weakened.

Initial foreground rendering was interrupted by the tool's execution window;
long reviews were rerun as bounded local processes with retained logs and exit
codes. One intermediate review was stopped to apply the numerical pin fix;
its outputs are not the final evidence. Trial sources/renders/logs are kept in
the evidence bundle, outside public source history.

## CI and next work

Base lookback/shoulder/girdle/primary/signal/foot jobs succeeded. Its combined
form job was cancelled at the final hand stage. Base Pages build, Blender jobs
and deployment also succeeded, independently checked this run. This does not
certify the new variant in Blender.

New bounded `balance-study.yml` uploads `poised-body-review`; final-commit CI
is pending at this checkpoint. Evidence is under `renders/balance-review/`.
Next: evaluate the aggressive rib/neck inclination and shoulder interpretation
against a simple humanoid mass blockout before adding any more decoration.

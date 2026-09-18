# Connected mechanical hands and open ceramic boundaries

Base main: **ea8140309c5e176c111382f36d332766aa6f04df**. Its exact offline kit
was recovered after connected GitHub reads; the recovered local tree matched
`3d4e999cbc149ae7738d53abf2094233e556e703`. The baseline Guided Form workflow
35319558349 and Pages workflow 35319558455 both completed successfully.
The containing commit is the implementation revision; later CI is separate.

## Accepted change

- General `rigidChain()` supplies parent-relative XYZ-degree FK rotations and
  exact local -Y link lengths without touching geometry. It is exercised by the
  mechanical fingers/thumb and an unrelated opposed-jaw gripper.
- New optional `handStyle: relaxed` uses a tapered palm, arcing knuckles,
  independently curled digits, distinct dorsal plates/palm pads and opposed thumb.
  Open/relaxed/grasp configurations retain identical geometric buffers. Ordinary
  rigid nodes are exported; this is not a skinned human hand or an animation rig.
- Independent `panelStyle: cutaway` splits the broad rib cover into a clavicular
  sweep and lower plate, and opens a deeper proximal thigh recess below the hand.
  All plates are thickened real contours on existing supports, not painted gaps.
- Published defaults remain unchanged. Camera, head/hair, torso/limb poses,
  lengths, wrist frames, foot geometry/contact and reactor mounts are unchanged.
  The palm emitter retains its independently scored location exactly.

API / sources: [rigid chains](../rigid-chains.md) and
[research notes](../research/rigid-hand-chains.md). Primary written sources are
Prokopenko's hand-gesture/construction and palm/dorsal form notes, and Blender's
connected chain hierarchy documentation. No premium video viewing is claimed.

## Actual local validation

- `npm run doctor`: Three.js r186, Chromium **144.0.7559.96**, SwiftShader WebGL2,
  virtual X display.
- `node --test tests/rigid-chain.test.js tests/prism-hands.test.js`: **7/7**.
- Expanded chain/hand/mass/gesture/limb/torso/form tests: **32/32**.
- `node --test --test-name-pattern="^cyber-form-study:" tests/models.test.js`:
  **1/1**, including default, determinism and parameter limits (69.8 s).
- `npm run build`: **44 recipes**.
- `node scripts/review-hands.mjs renders/hand-review`: **10 cases / 50 renders**;
  scene, hand and gripper GLBs each **0 errors / 0 warnings**. Informational
  validator messages remain in the saved full reports.
- Bounded `timeout 180 npm test`: **165 passing subtests**, no reported failures,
  exit **124**. This is not a completed repository-wide local suite.

All final render cases share source fingerprint
`41f29155c8855518f8302ed99324c05b18e87a12103a1797360f3ce0ff280058`
over **223 files**. The final build yields the same computational fingerprint.
Full scene changes **658,572 -> 687,828 triangles** and **661,764 -> 652,378
vertices**. Hand changes **16,956 -> 18,576 triangles**; new hand is **16,751
vertices**. The gripper is **8,220 triangles / 23,820 vertices** in both poses.

Actual reference landmarks are unchanged: **9.8003344814 px RMS /
25.9151421421 px maximum**. This is placement stability, not a likeness score.
Tests verify world matrices of mounts and palm emitter, unchanged head/foot mesh
buffers, mirrored digit endpoints, exact connected link lengths and immutable
geometry across hand poses. No new normal bake, shader or texture claim.

## Visual evidence and rejected approaches

Material, neutral clay, wire, silhouette, side and alternative views were rendered
and inspected. The fingers now curl independently toward the palm instead of
forming a regular row. The cutaway chest has a visible collar gap; the thigh has
an actual black recess beneath the fingers. The arm/body gesture remains fixed.
The full-frame change is local and does not solve the simplified body, head,
regular reactor/cable layout or boot contour.

- The first shallow thigh recess was not visible beneath the hand in the locked
  hero. Its bottom was extended in the construction contour, not the reference
  annotation. The trial render is retained in local evidence.
- A reused local browser terminated during the initial full-scene capture. That
  interrupted attempt is not counted as a pass. The review uses the repository's
  existing isolated `createRenderBatch` with retries disabled; the final review
  completed all cases. No browser error or geometry warning was suppressed.
- A new preservation test initially treated a named foot Group as a Mesh; it was
  corrected to compare every descendant mesh, retaining the stronger invariant.

Final artifacts: `renders/hand-review/` contains all reports, GLBs, individual
PNGs and `hero-comparison.png`, `body-comparison.png`, `hand-comparison.png`.
The reuploaded reference was inspected privately, 768 x 1376, encoded SHA
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`.
It differs from the historical raster checksum; no original encoding verification
is claimed. No reference raster or edited annotation is in this commit.

## Limits and next target

This hand is an articulated mechanical assembly, not a watertight skin. Chains
provide no joint limits, collision/contact solver, tendon simulation or IK.
Material/geometry ownership remains the caller's responsibility. Repeated chain
names are scoped by their owner; animations require unique track targets. The
palm emitter remains a raised module, not an integrated flesh surface.

The next useful structural pass is the boot/ankle and lower shin relationship:
reduce the regular shoe-like outline and rebuild the articulated heel/instep
shells while retaining planted contact. Broad body contour proportions and the
simplified face also remain visible discrepancies. Avoid another decoration-only
pass. New-commit CI/deployment is pending at this checkpoint; inspect separately.

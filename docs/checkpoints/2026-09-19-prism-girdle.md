# Connected shoulder girdle and neck

Base main **45af342f6ba6b63d0f05d3745edb8f5dea755830**, verified by connected
GitHub and its locked authoring kit. Exact baseline tree:
`e492ade8e53920c284f1d68d360a5d4b7acf4170`. The containing commit is the
implementation revision. Base combined form, primary, signal and foot CI all
completed successfully, as checked this run.

## Change

New `bridgeSurface()` is a pure cubic-Hermite span between corresponding source
curves, with explicit transverse derivative fields, independent of rendering
resolution. [API](../bridge-surfaces.md) and
[primary source notes](../research/shoulder-girdle-boundaries.md).

Optional `girdleStyle: connected` resolves the posed torso, shoulders and head in
one torso-local coordinate space. Clavicular bridges and posterior scapular fans
reach the existing shoulder balls; trapezial spans connect toward the neck.
A shared top-ring collar joins the torso to the tilted cervical connector. The
previous vertical bellows stopped at an unrelated point behind the head; the
new connector ends at an authored local point beneath the unchanged head.
Shoulder cowls now curve around actual apertures for the retained emitters.

No camera, pose, joint origin, limb length, head/hair, hand, foot, reactor, light
or reference annotation changes. No new shader, texture or normal bake. New
geometry is independently owned, standard-PBR, with UVs. The connection is a
build-time geometric hypothesis, not a welded manifold, skin rig or anatomical
reconstruction. Rebuild after posing source owners.

An unrelated oval-to-round tilted duct exercises the same support. Its mouths
and rigid flanges remain fixed while transverse derivative choices control the
interior path. It is not a second android component disguised as a fixture.

## Local checks

- `npm run doctor`: Three.js r186 / Chromium 144.0.7559.96 / WebGL2 / SwiftShader,
  virtual display; passed.
- `node --test --test-concurrency=1 tests/bridge-surface.test.js tests/prism-girdle.test.js tests/surface-boundary.test.js tests/surface-contour.test.js tests/prism-torso.test.js tests/prism-gesture.test.js tests/section-shape.test.js`:
  **32/32 passed**, including six new tests.
- `timeout 100 node --test --test-name-pattern='cyber-form-study' tests/models.test.js`:
  **1/1 passed** in 63.9 s (default, deterministic bounds, parameter limits).
  The tool call returned early; the retained completed TAP log confirms success.
- `npm run build`: **44 recipes**, passed.
- `node scripts/review-girdle.mjs`: **6 cases / 42 renders / 3 GLBs**, all **zero
  validation errors and warnings**. Includes hero material/clay/silhouette;
  four girdle views with material/clay/wire; two duct views and both shapes.
- Final review fingerprint:
  `e68c8ce108bdbde60be947661bdaf7168e1c4ab4550b0b49a0696709851bd0ed`
  over **239 computational files**. Every final case has this fingerprint.
- `timeout 180 npm test` ended with exit **124** after **176 passing subtests**, no reported failures before the bound. This is not a completed full-suite pass.

## Measured scope

Before/after scene: **645,300 -> 636,428 triangles**, **627,298 -> 629,110
vertices**, **906 -> 919 primitives**, **49 -> 50 materials**. Fewer triangles
but more vertices/parts; no universal performance improvement is claimed.
Isolated girdle: **215,184 -> 206,312 triangles**. Duct: **5,072 triangles**
for either shape. New bridge meshes replace more densely tessellated old collar
plates; count reduction is not an accuracy score.

Tests compare unchanged pose/world transforms, reference-guide data and unchanged
head, hands, foot, limb and emitter buffers. Bridge end samples lie on the posed
analytic shoulder balls to <1e-12 in their local frame; compiled outer boundary
vertices match source curves to <1e-7. Collar inlet matches the torso top ring.
These are analytic-contact tests, not a proof of collision-free meshes.

Reference landmark errors remain **9.8003344814 px RMS / 25.9151421421 px max**.
Old/new hero silhouette overlap **0.9905498**, foreground mean absolute RGB change
**0.0093470**. These compare renders, not likeness. The original reupload was
visually available; encoded SHA is
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`, differing
from the historical original-byte hash. No reference raster is added to Git.

## Visual judgment and rejected/incomplete trials

The old high, detached neck tube is gone. The emitter seats read more integrated
with their cowls, and back/side views now show front/rear shoulder supports
rather than empty gaps. The full-image likeness improvement remains local and
modest. The outer shoulders, broad armor, empty-looking abdomen and simplified
head/face/backpack still differ markedly from the artwork.

The first bridge trial left the torso's top ring visibly open from behind. It
was not retained as the final construction: added a closed-perimeter collar
span using that exact source ring, then reran the full review. Initial and final
images and the earlier source are preserved in the evidence archive. Shoulder
roots were not moved again to camouflage the previous disconnection.

The posterior spans are intentionally separate thin structural shells, not a
continuous skin. Their contacts and contour intersections can still be refined.
Duct u-seam/thickness faces and all girdle pieces remain separate tessellation;
this is not an automatic watertight remeshing tool.

## CI and next work

Existing form workflow gains a bounded `girdle-study` job and
`shoulder-girdle-review` artifact. No permission, concurrency or security setting
changes. Final commit CI/Pages pending when source checkpoint is written;
local GLB validity does not certify Blender appearance or deployment.

Evidence: `renders/girdle-review/`, `review.json`, `hero-comparison.png`,
`body-comparison.png`, per-case images and validated GLBs. Keep bulky results
out of source history. Next primary correction: shoulder emitter/cowl attitude
and upper-arm-to-rib silhouette, assessed against the illustration and side
views before adding decorative mesh detail. The current emitter faces are still
more oblique than the reference even though their centers match.

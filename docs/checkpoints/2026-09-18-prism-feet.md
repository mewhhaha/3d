# Mechanical feet and curved apertures — 2026-09-18

Base main **72a534a1b7a9db52b22c6c6e10fc89de077aa3cf** was read through GitHub;
its exact authoring kit was recovered. The containing commit identifies the tested
code revision. No older local snapshot was promoted. All previous defaults remain.

## What changed

`surfaceContourGeometry()` now accepts disjoint interior aperture loops. It
validates winding-independent simple loops and containment/non-intersection,
triangulates the outer-minus-holes domain, then refines before evaluating the
curved support. Existing solidify builds the inner walls. Named contour armor
forwards the same holes to ceramic and substrate; these are actual open mesh
boundaries, not painted darkness. The separate service bracket exercises reuse.

Optional `footStyle: bridged` reconstructs both boots with a lower toe wedge,
asymmetrical sloping instep, separate heel guards and perforated orange side
carriers. The planted sole datum remains -.0435 local metres. Pose, joint lengths,
head, hands, knee/ankle origins, camera, reference annotations and lower-shin
geometry remain unchanged. Foot features, UVs, materials and named parts remain
independently owned. No new normal bake, shader or skinned-foot claim.

A real iteration blocker appeared during the complete scene transfer: Chromium
144 reported `max_buffer_size=104857600` and `Connection closed, not enough capacity`
before ObjectLoader completed. The old one-command JSON transfer exceeded its
DevTools pipe buffer. `loadSceneJSON()` now accumulates bounded strings on an
owned JSHandle before parsing/loading. No geometry was removed and no warnings
were suppressed. Errors propagate; the existing renderer timeout still applies.
See [scene transfer](../scene-transfer.md) and [source notes](../research/feet-and-apertures.md).

## Actual local checks

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, SwiftShader WebGL2 / Xvfb.
- `node --test tests/scene-transfer.test.js tests/surface-contour.test.js tests/prism-foot.test.js tests/prism-hands.test.js tests/mass-forms.test.js tests/prism-limbs.test.js tests/prism-gesture.test.js tests/prism-torso.test.js tests/form-design.test.js`: **42/42**.
- `node --test --test-name-pattern='cyber-form-study' tests/models.test.js`: **1/1**,
  default/determinism/parameter extrema, rerun after the final toe correction.
- `npm run build`: **44 recipes**.
- `npm run test:render`: passed the actual Chromium render/rig/export regression.
  Its unrelated skinned fixture reports **0 errors / 6 warnings**, including
  `NODE_SKINNED_MESH_NON_ROOT`; those warnings were retained, not suppressed.
  They are not warnings from the new foot/scene/bracket GLBs below.
- A broader `timeout 180 npm test` attempt exited **124** after **165 passing
  subtests**, with no reported test failures. It is not a complete full-suite pass.
- `node scripts/review-feet.mjs renders/foot-review`: **7 cases / 34 renders**,
  including fixed-camera before/after, material, clay, wire, silhouette, side and
  opposite-handed views. **3 GLBs: zero errors / zero warnings**. Full validator
  reports preserve informational messages (scene 1066, foot 52, bracket 1).

Every final case has source fingerprint
`bd3e3c82a942c9f2804d4b731ed7f2a98873866f6fea18490dc5eaecc5612f45`
(**228 files**). Scene: **687,828 -> 722,916 triangles**, **684,030 final vertices**.
New isolated foot: **48,816 triangles / 41,880 vertices**; bracket: **3,464 / 3,090**.
The increase is new geometric construction, not a normal-map result.
Reference landmark RMS/max remain **9.8003344814 / 25.9151421421 px**.

The transfer-only regression preserved baseline PNG bytes exactly:

- material `8817149b9598518eb92b724dbc6b67e38f8514fd5e80f20da4bda3b7c25e7c2a`
- clay `6e38047b5a3b361ae104861441183eb432e688b2ccdd4a66c032464d40a39000`
- silhouette `1ef0cc9678adc150c4448d3c6de7851570da369fc4cef7e4de460ae7e38c79aa`

## Visual review, rejected trials and scope

Side clay shows the lower toe, diagonal bridge and visible carrier openings. The
full-scene improvement is local and modest. Broad smooth limb/chest armor, very
regular reactor/cables, simplified face and overly regular haircut still make
this far from the illustration. The lower-shin meshes were deliberately not
changed in this bounded pass. The boot is still a multi-part mechanical assembly,
not a welded watertight foot or a contact/collision simulation.

The first full-scene attempts stalled at transfer (before rendering); their
Chromium diagnostic is retained in the evidence bundle. No successful render was
claimed for those attempts. A protruding dark toe closure was rejected; its end
was recessed from .175 to .166 m with .005 m terminal height, inside the planted
sole perimeter. The accepted review was rerun afterward. Smaller component views
and the unrelated bracket remained usable throughout the transfer diagnosis.

Geometry and shader limitations remain separate: the illustrated head exports
its existing standard-PBR fallback; the new feet use standard materials. Apertures
support one exterior with disjoint non-nested holes, not arbitrary CSG. Rounding
is in the authored UV domain, not an exact physical fillet. New contour topology
does not transfer skin weights, old anchors, or high/low correspondence. Scene
chunking still holds full JSON in memory and does not bound outgoing GLB size.

The supplied reupload was visually consulted; its encoded SHA is
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`, not the historic
original checksum. No hash equivalence is claimed and no raster is committed.

## Evidence and CI

Generated evidence: `renders/foot-review/review.json`, `hero-comparison.png`,
`foot-comparison.png`, named case PNGs/GLBs and validation reports. The final
foot review runs in a separate bounded `foot-study` job and uploads
`foot-aperture-review`, rather than extending the already long combined review.
The base combined form run was cancelled at its final hand-review stage after
all preceding stages passed; this is not a baseline full-review success.
New-commit CI/Pages results must be inspected independently after pushing.

Next modeling priority: assess the whole figure again at the locked camera,
especially shoulder/rib depth, pelvic silhouette and the broad shin/boot bridge;
not repeated micro-detail on the new apertures. Overall likeness remains unaccepted.

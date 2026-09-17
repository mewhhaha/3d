# Connected body gesture and joint interfaces — 2026-09-17

Base: `9ec8e2a50cb5f5e71404a830f66b67f298e63ffc`, verified through connected
GitHub. Exact source and locked dependencies came from authoring-kit run
`35267340440`, artifact `10516634036`. The containing commit identifies this
implementation. Base form CI and full Pages build/native jobs/deploy are verified
successful; that does not certify this new variant's native appearance.

## Problem, implementation, and scope

The latest scalloped limbs were already on main despite the interrupted reply.
Their wrist/ankle-constrained two-link construction was retained. The remaining
trunk acted like a rigid rib/pelvis block, and bare hip/elbow balls met the armor
abruptly. The earlier local-only descendant-warp experiment stays rejected: no
skipped meshes, disconnected joint edits, or relaxed regression assertions were
promoted here.

New generic `sectionPose` evaluates authored section offsets and quaternion
orientations in one Y-up space. The torso support, contour shells, mounted details,
and proximal limb sockets share this field. `twoLinkPose` then re-solves complete
chains to the old wrist/ankle targets at exactly the old link lengths. The original
body construction frame is retained to avoid applying a moved frame twice.

Independent `jointStyle: housed` builds open spherical hip/elbow cowls, a smaller
shoulder cowl, and upper-arm plate clearance. This is geometric shell shaping,
not another pose edit. All legacy defaults remain unchanged. Head, hair, camera,
foot contact and reactor transforms are preserved. Hand orientation follows the
re-solved forearm even though its wrist position is fixed.

Distinct reuse: `studies/section-duct.js` bends a mechanical sleeve with independently
oriented rigid end flanges. The same section field drives both; it knows nothing
about anatomy, reference pixels, mesh tessellation or materials. Contract and
limitations: [section poses](../section-pose.md). Written-source observations and
adaptation: [research notes](../research/section-driven-gesture.md).

## Actual commands and results

- `npm run doctor`: passed, Node 22 / Three.js r186 / Chromium 144.0.7559.96 /
  SwiftShader WebGL2 with Xvfb fallback.
- `node --test tests/section-pose.test.js tests/prism-gesture.test.js tests/prism-limbs.test.js tests/prism-torso.test.js tests/two-link-pose.test.js tests/surface-contour.test.js`:
  **22/22 passed**. Existing preservation tests were not weakened.
- `npm run build`: passed, **44 recipes**.
- `node --test --test-name-pattern="^cyber-form-study:" tests/models.test.js`:
  **1/1 passed**, defaults/determinism/parameter extrema, 56.0 seconds overall.
- `timeout 300 npm test`: exit **124**, reached **184 passing subtests / zero
  reported failures**; this is not a completed full-suite local pass.
- `node scripts/review-gesture.mjs`: completed **7 cases / 39 renders**, with one
  fingerprint across every case:
  `f792732c540b96dcffd2e9797bc4cb0d103b0ad7ef547f716d05b3ad05f7b6a9`.
- Three GLBs (full scene, body/limb study, duct) each validate with **0 errors /
  0 warnings**. Validator infos retained: 1002 / 396 / 3 respectively.

Before and pose-only scenes: **621,196 triangles / 627,684 vertices**. Adding joint
cowls makes the final scene **643,084 / 647,604**. Isolated final body: **337,912 /
295,422**. Duct before/after: **9,632 / 5,624**. This is not a new normal-bake claim;
the head/hair support and existing bake are untouched.

The unchanged manual reference landmarks report RMS **11.163241 -> 9.800334 px**,
but maximum error **24.749533 -> 25.915142 px**. The maximum got slightly worse;
these annotations are not a held-out likeness score. No annotations were edited.

## Visual evidence and rejected experiments

Artifacts: `renders/gesture-review/` contains final hero before, pose-only, after,
body comparisons in material/clay/wire, the separate duct, validated GLBs, metrics
and `review.json`. `hero-comparison.png` and `body-comparison.png` lock the same
cameras. Generated bulky output stays out of Git.

Inspected actual final material, clay, wire, silhouette and alternative views. The
waist has a clearer offset/countercurve, and the hip/elbow cowls give the limb roots
an actual surrounding shell. The change is modest in the full composition and
clearer in the side/three-quarter clay. Shoulder spheres are still too exposed from
behind; upper-arm overlaps are reduced, not comprehensively collision-validated.
The hands, broad thigh plates, smooth dark trunk, reactor and cable assembly still
look much simpler and more regular than the illustration. No likeness acceptance.

Rejected trial1: stronger pelvic offset/roll splayed the far knee outward while
holding the ankle, harming the stance. Retained smaller pelvic turn with a stronger
waist offset and modest rib rotation. Trial3 used the reference rather than relaxed
limb pose; not accepted, so the final comparison retains the same relaxed targets
and foot splay. Intermediate renders remain under `renders/gesture-trial1..3/`.

Reference: the actual reuploaded 768x1376 artwork was visually available, encoded
SHA-256 `8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`,
not the historical original-file hash. It was not substituted with generated art
or published in source history.

## Limits / next target

Build-time sampled field, not a skinned spine/B-Bone implementation, physical
balance solver or collision detection. Section interpolation can stretch/fold
surfaces under strong edits; thickness and socket spacing remain affected by the
older nonuniform body mount. Open trunk ends and hidden shoulder interfaces remain
unfinished. Shader-to-PBR fallback limitations of the illustrated head are unchanged.

Next visible target: shoulder-to-rib depth/overlap and the broad pelvis/thigh
silhouette, evaluated against the original rather than adding surface decoration.
Use these connected section/socket controls rather than rotating armor away from
its joints. New-commit CI is pending at this checkpoint; component checks, Pages,
native Blender appearance and visual assessment remain distinct.

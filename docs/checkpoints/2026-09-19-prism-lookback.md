# Gesture, form factor and material-only illustration

Base **b0768136e7cc504ab0564669aa91c6bb486a2b68**, exact locked source tree
`39ec17049269a2c25dd4ea395968668af175991c`, verified through the connected GitHub
API and its authoring artifact. The containing commit is the implementation
revision. Base combined form and six independent component reviews passed.

## Intent and implementation

The user explicitly identified pose/form factor as the main remaining problem,
not missing polygons. The new `gestureStyle: lookback` is a deliberate correction
hypothesis: a narrower, turned rib/shoulder section above an offset waist and
opposed pelvic section. This is not a claim that the previous guide recovered
the correct skeleton. Existing defaults and the original annotation files are
preserved, with new pose coordinates recorded separately.

The existing `sectionPose` now accepts positive per-section scale. It maps both
the continuous support and attachment locations before two-link limb solving.
The new arm ratio is **.285/.265 m**, replacing **.25/.30 m** only in this variant;
total arm reach remains .55 m. The near arm also uses a 30-degree pole swivel.
Leg lengths remain .43/.45 m. Wrist and ankle targets, planted foot transforms,
head/camera and reactor positions are unchanged. The old arm ratio trial left
the near elbow too far outboard; it remains in the evidence, not the final pose.
This is an authored proportion choice, not universal anatomy.

`contourLineMaps` paints inset pigment and roughness along actual rounded contour
boundaries/holes in existing UVs. `applyContourLook` runs after all replacements;
it does not allocate maps for temporary armor. `surfaceStyle: pigment` is standard
PBR; `outlined` uses the existing two-tone shader with an authored key direction
and independent shadow tint. Both use identical geometry, UVs, normals, tangents
and indices. No new normal bake, displacement or camera projection is claimed.
The outlined WebGL look is **not portable glTF**; GLB contains the actual pigment
maps and standard PBR fallback. The review includes that fallback explicitly.

The unrelated tapered inspection cover exercises section scale and contour maps
(including an aperture), with identical geometry between material controls.
[API](../lookback-and-pigment.md) and [source notes](../research/gesture-before-pigment.md).

## Checks and evidence

Final exact results are recorded below before publication. The full local suite
is bounded; only completed focused and recipe checks count as passes.

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2,
  SwiftShader and virtual display; passed.
- `node --test --test-concurrency=1 tests/section-pose.test.js tests/lookback-style.test.js tests/prism-gesture.test.js tests/prism-limbs.test.js tests/prism-girdle.test.js tests/material-regions.test.js tests/illustration.test.js`:
  **30/30 passed** on the final source.
- `timeout 180 node --test --test-name-pattern="cyber-form-study" tests/models.test.js`:
  **1/1 passed**, 134.6 seconds, including default/determinism/parameter limits.
- `npm run build`: **44 recipes**, passed.
- `timeout 180 npm test`: exit **124**, **175 passing subtests**, no reported
  failures before the bound. Not a completed full-suite pass. An earlier broad
  run on superseded source was stopped and is not counted as final validation.
- `node scripts/review-lookback.mjs`: **8 cases / 42 renders / 3 GLBs**, each
  with **zero validation errors and warnings**. Full scenes include pose-only,
  standard PBR pigment, and pigment plus directed two-tone controls; three body
  views include material/clay/wire; the independent cover has two views.
- Final source fingerprint:
  `d19be4da5055e9015a2c61201d6c02bfe496bccc7829e9827a673b75a91734d2`
  over **246 files**, identical in every case. Final arm-ratio correction is
  included. An earlier full review is preserved as superseded evidence.

All four full scenes retain **638,388 triangles / 630,814 vertices / 921 meshes**.
Material assignment raises primitives from **921 to 963** and material count
from **50 to 92**. The 42 coated parts add 84 128x128 maps: **5.25 MiB base RGBA8
storage before mipmaps**. This trades pixel/material cost for line definition;
there is no frame-rate or universal memory-saving claim. Both scene GLBs embed
all **98 images**; the independent cover embeds its two images. Standard UV
transforms are carried by KHR_texture_transform. Custom two-tone lighting is not
portable; standard PBR is the export fallback. Validator informational messages
remain in the reports (891 for each scene, one for the fixture), not suppressed.

The body study retains **373,784 triangles** and the inspection cover **2,200**.
Tests prove the material-only controls leave every position/normal/UV/tangent/
index buffer and world transform unchanged. Geometry is rebuilt for the new
pose/support, so unchanged low geometry across *pose variants* is not claimed.

Against unchanged annotations, landmark RMS/max changes from **9.8003/25.9151 px**
to **5.1609/8.2448 px**. That is a measurement, not a confidence/likeness score.
The new pose versus the previous render has silhouette IoU **.922132**; the
material-only comparison is **1.0**. Foreground mean absolute RGB change is
**.104696** for the pose and **.055302** for material treatment. These compare
renders, not the reference. No annotations were moved to improve metrics.

Evidence: `renders/lookback-review/review.json`, `hero-comparison.png`,
`body-comparison.png`, per-case images, logs and GLBs. The new bounded CI job
uploads `lookback-pigment-review`. Final-commit CI/Pages are pending at this source
checkpoint; no new native Blender appearance or full-gallery claim.

## Visual assessment and rejected experiments

The retained pose reduces the wide front-facing shoulder spread and places the
near elbow closer to the body. The shaded maps make ceramic boundaries easier
to read without any added triangles. It is still not a close reproduction. The
far optical module is more occluded, the far arm/torso overlap remains uncertain,
and the rib/abdomen still reads too smooth and hollow. The hair, face, broad thigh
plates and sparse backpack remain major differences. A reduced landmark error
would not certify the sense of confidence or correct occluded anatomy.

Rejected: the first -30-degree narrow-rib trial moved the near shoulder too far
left/up. The second trial corrected that placement but the original arm ratio
put the near elbow too far outward. Both source snippets, a complete initial
review and images are preserved in the local evidence archive. A first material
trial was too uniformly light; the retained ramp provides stronger side-plane
separation. A foreground-tool timeout interrupted an early 256px coating render;
final 128px-per-part maps and post-construction material application completed
the bounded review. No failure was converted into a success.

A new map test initially expected a fully dark sample from a subpixel stroke at
64px. That expectation was wrong under antialiasing; its dark-interior fixture
now supplies a wider stroke, retaining the same darkness assertion and the
actual subpixel filtering behavior. Previous tests were not relaxed.

The reuploaded illustration was available and visually inspected; its file hash
is `8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`, different
from the historical original-byte checksum. No raster is committed to Git.

## Next

Resolve the far-arm/rib overlap and real silhouette of the pelvis/thigh covers,
using the whole figure as the review unit. Do not return to adding more tiny
housings while the body language is unresolved. The shaders are a presentation
choice, not a substitute for that remaining pose/form work.

# Rough costume on the corrected upright rig

Base main **33c072f4b28f62e2f2f81cc2799e78ac768c6275**, exact tree
**81c40ffbb6e5832806b35996db4ca61e3efbf65d**, recovered from the latest connected
GitHub authoring kit and verified locally. Base imported-humanoid CI passed.
The containing commit is this implementation revision. The previous response's
local edits used an old Sept17 kit and were not published; none were carried
into this source or used as the accepted pose. The actual current base is kept.

## Implementation and scope

`mountOnBone` resolves an independently authored rigid component into a named
bone's rest frame, compensating the imported armature's .01 units. It preserves
model placement and rejects nonuniform, reflected, singular or sheared bone
frames rather than silently distorting the part. The existing rig/skin is not
rebound. Geometry, attachment, pose and look are distinct operations.

`prism-armor-blockout` adds chest/iliac plates, upper-arm/forearm/thigh/shin shells,
shoulder caps, shallow mapped optics, coarse foot covers/orange soles, a backpack
mass/disk and three cable loops. Limb supports use radial rest-skin samples from
bone-influence regions and the existing surface cache, with explicit coarse
fallback on misses. All are fresh shell geometry, not copied source topology.
The selected pose remains **upright**. No new body targets, countertwist, head
orientation or camera edit was introduced. The head remains faceless/unhaired.

The independent `bone-mounted-prop` fits an enamel guard to an articulated
inspection arm using the same mount and material operation. It is not another
humanoid example.

The generated material board is used only for two explicit 32x32 color crops,
with indexed palettes and provenance in `studies/data/armor-study-swatches.json`.
The board hash is `6dedf371c320c0499057b757541992e65ef2ac2d799343ec0e597b687b47c575`.
Enamel crop [236,164,314,241], rubber crop [708,204,767,258], source 1254x1254.
`indexedColorTexture` supplies owned sRGB textures with explicit image-row/UV
orientation. Roughness/metalness are authored constants; existing radial profile
maps supply color/emission. The generated purple normal-map illustration was
not used. No normal bake, shader invention or physically recovered PBR maps.
No original reference raster or whole generated board is put in source history.

## Final actual local checks

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2/SwiftShader and
  virtual display; passed.
- `node --test tests/bone-mount.test.js tests/refit-skin-bind.test.js tests/skeleton-pins.test.js tests/skeleton-pose.test.js tests/material-regions.test.js tests/local-render.test.js tests/export-skin-roots.test.js`:
  **28/28 passed**, final rerun exit 0. Includes three new mount/pixel tests.
- `npm run build`: **45 recipes**, final rerun exit 0. Optional imported study
  is not a new default gallery dependency.
- `node scripts/review-armor-blockout.mjs`: **8 cases / 26 images / 3 GLBs**,
  all zero validation errors/warnings. Unused-UV informational messages remain.
  Exit 0 and `ARMOR_BLOCKOUT_REVIEW_OK` are captured in final-review.log.
- All final cases share fingerprint
  **585f5d358b9fd286de10659333d2d5f5403e3df9cc4d2e07c2bf2b65782728bf**
  over **280 computational files**.
- Exact comparisons: all 67 bone world matrices in five clips, source positions,
  normals, UVs, weights, indices and inverse binds retained; plain/textured
  geometry equal; their silhouette PNGs identical; bind/posed-preview exports
  byte-identical. Materials/groups on the source skins intentionally change.
- Actual browser GLB reload decodes all eight embedded textures, including the
  two generated samples, without stubbing images. All **22,659 rigid vertices**
  are checked under `upright` and `neutral`; maximum error **4.51e-16 m**.
  All **1,350 rigid probe vertices** agree exactly in its two clips. This is
  rigid attachment export verification, NOT a new full-skin reimport claim.
- `npm run test:render`: **LOCAL_RENDER_OK**, exit 0; 20-view/pass runtime,
  freshness and isolation regression. Its old hand fixture retains six validator
  warnings. Those are neither suppressed nor attributed to the new costume.
- `timeout 180 npm test`: exit **124** after **192 passing subtests**, without a
  reported failure before the bound. Not a completed full-suite pass.

Bare **49,112 -> 71,300 triangles** with armor; **41 meshes / 43 primitives /
51,033 vertices / 13 materials**, two existing skins. Added geometry is 22,188
triangles, not a fair performance comparison with the earlier complete city scene.
Both armor looks have the same geometry. Two color crops occupy 8 KiB RGBA8
before mipmaps; radial color/emission maps add 384 KiB. No frame-rate claim.
The independent mechanism totals 820 triangles.

The old bare hero remains byte-identical to the previous upright image:
`608fab69b4f1597c6acd1e515730cc4462abdbdc999dc7ee271708843038895a`.

## Visual evidence and rejected attempts

Opened final material board, four-angle clay, wire and back material images.
The rough costume now follows the correct pose and separates light shells from
black structure. It is NOT close to finished likeness. Chest/hip panels have
conspicuous stand-off, the feet are slab-like placeholders, rear coverage is
sparse, backpack/cables are simple masses, and face/hair are not fitted. The
fixed hero lights leave the back material view dark; neutral clay is essential
for judging those surfaces. Generated color variation is subtle at this scale.

Trial1 authored radial supports intersected the body. Trial2 enlarging them was
too bulky. Trial3 radial rest fitting improved contact but left an awkward upper
thigh lip. Trial4 contoured boundaries and shorter upper coverage were retained.
Trial5 closer projected chest/hip panels collided in pose because rigid owners
and multi-bone source skin deform differently. That trial was rejected; final
panels retain conservative stand-off. No collision-free claim follows from rays.
Each limb fit records 1,320 samples, with 120/164/227/79 misses per upper arm/
forearm/thigh/shin on either side. Misses use the authored fallback explicitly.

One review ran while source changed and concurrent full-suite work was active;
it ended **137**, with one cgroup OOM kill observed. Its partial report and logs
remain in `armor-mixed-source-attempt`. It was not relabeled successful. Binary
comparisons now use Buffer.equals assertions, avoiding enormous byte dumps on
failure while retaining exact equality. A serialized complete review passed,
then passed again after the final uniform-scale validation change. Trial sources,
failed attempt, both good reviews and command logs are preserved externally.

## Durable continuation

[API](../bone-mounted-armor.md) and
[primary written sources](../research/rigid-costume-and-color-samples.md).
Evidence: `renders/armor-blockout-review/`, trial folders and `renders/session/`.
Existing imported CI adds this review and publishes PNG/JSON only, not the
Adobe/Mixamo source or derived model pack. No permissions/security changes.
Final-commit CI/Pages pending at source checkpoint; no native Blender claim.

Next: fit chest/iliac/foot contours and their attachment clearances in the upright
pose, then add a rough head/hair costume. Keep the corrected pose unchanged and
avoid details that conceal those primary gaps. The older full android remains
untouched, not silently replaced by this optional Mixamo-derived study.

# Plain humanoid rig foundation

Verified latest main **dabc5272dd20d60e5a6ca57f3d8ba54b6211c8c4**, exact source
tree **71fa5d9c347247b62e131d1a0c2fdc3c151023e4**, recovered via its locked kit.
The containing local commit is the tested implementation. The earlier unpushed
`0169246` flow patch was preserved but not applied over newer upstream pose work.

## User direction and implementation

The user asked to start with a plain Mixamo-style male/female humanoid rather
than continuing detailed robot corrections. This adds a separate original
mannequin, not a downloaded service asset. Slender/broad presets, stature,
shoulder span and hip-socket span share one 28-joint skeleton. Geometry comes
from simple tapered primary volumes. All 34 parts have UVs and skin weights;
most are rigid one-bone attachments, with a blended waist. No reference-specific
pixel coordinates or anatomy assets enter these helpers.

Reuse: existing `skeleton`, `skinnedPart`, `jointBlend`, `clip`, `twoLinkPose`,
local render/animation/export paths. New APIs separate measurements, skeleton,
pose, and proxy geometry; `humanoidPoseClips` also accepts authored named poses.
There are no new dependencies or changes to the detailed android's geometry,
pose, camera, materials, reference annotations or defaults.

T-pose bind plus neutral/contrapposto/lookback hold clips make the silhouette
visible without hair, armor, emission, textures or a city. Each clip keys all
bone positions/quaternions; repeated pose changes reset to bind before solving.
Two-link solving preserves actual segment lengths, and the foot rotation keeps
a flat sole datum. Failed custom solves restore the prior pose.

## Real export blocker corrected

Initial GLBs had 34 `NODE_SKINNED_MESH_NON_ROOT` warnings. The review stopped on
them; the test was not relaxed. Opt-in `exportSkinRoots` now promotes identity,
childless model-space skins to actual export-scene roots. The skeleton and clips
remain together; source geometry/bind matrices stay unchanged. Invalid mesh or
ancestor transforms/mesh-node animation fail before hierarchy mutation. Legacy
assets remain opt-out. The in-memory Chromium module map loads the new helper.

The independent existing cage-hand render test still reports six nested-skin
warnings, not suppressed or claimed fixed by this component's validation.

## Actual local checks

- `npm run doctor`: passed; Three.js r186, Chromium 144.0.7559.96, WebGL2,
  SwiftShader and virtual display.
- `node --test tests/humanoid-mannequin.test.js tests/export-skin-roots.test.js tests/rigging.test.js tests/two-link-pose.test.js tests/local-render.test.js tests/canonical-glb.test.js`:
  **19/19 passed**; eight new tests cover proportions, multiple heights, pose
  lengths/targets, rollback, real skin deformation, ownership and export layout.
- `timeout 140 node --test --test-name-pattern='humanoid-mannequin' tests/models.test.js`:
  **1/1 passed**, including default, determinism and parameter limits.
- `npm run build`: **45 recipes**, passed.
- `timeout 140 npm run test:render`: **LOCAL_RENDER_OK**, real Chromium,
  existing preview/export isolation, dependency freshness and pixel checks.
- `node scripts/review-humanoid.mjs`: **7 cases / 65 images / 3 GLBs**, all zero
  validator errors/warnings. Includes T bind with skeleton overlay, neutral and
  posed material/clay/wire/silhouette, and slender/broad proportions.
- All final cases share computational source fingerprint
  **6fb7919af2d4b13581e6c84d34f4d9196fa3a16335d829319e2a0cbc370135a2**
  over **253 files**.
- `timeout 180 npm test`: exit **124** after **183 passing subtests**, no failures
  reported before the bound. Not a completed full-suite pass.

At default resolution either build has **11,968 triangles / 7,514 vertices /
34 meshes / 2 materials / 0 textures / 28 bones**. No renderer overlays belong
to these geometry counts. This proxy is not a lower-LOD replacement for the
full android, so no scene triangle reduction or performance claim is made.

GLTFLoader reimport checked all three clips of each exported GLB: four vertices
per mesh, **136 samples per pose**, maximum positional error below **5.33e-8 m**.
Bind-preview and lookback-preview slender GLBs are byte-identical. This validates
sampled skin/export behavior, not arbitrary Mixamo/FBX animation retargeting.
No new normal bake, shader, image-generated texture or native Blender test.

## Visual inspection and rejected trials

Reviewed fixed-camera pose board, front/side proportion board, T-bind skeleton,
side wire and material/clay views. The plain body makes the pelvis/chest
counterturn and arm hang easier to judge than the armored scene. It remains a
draft: the waist has a visible segmented seam, shoulders/elbows are simplified,
mittens have no finger joints, and far-hand occlusion remains in the lookback
pose. There is no continuous anatomical skin or self-collision solver.

First wrist targets overbent the arms and were unreachable for one broad
configuration. They were replaced with stature-relative shoulder-offset targets
with a modest elbow bend. A tighter hand placement intersected the thigh visually;
the final targets provide more lateral clearance. Rejected source snapshots and
renders remain in the evidence archive. The first export-layout attempt missed
the browser module import, failed loudly, and was fixed before the final review.

The cyber reference was visually available, but this is not a scored likeness
fit. User reference/screenshot rasters are not added to Git. Existing detailed
android is intact and has **not** been rebound to this skeleton. The next step
is accepting/correcting this simple proportion/stance study before attaching
one existing ceramic component and verifying it follows the same bones.

## Publication and evidence

The latest upstream guided-form, cyber-scene and local-studio CI were verified
successful. This session's connector discovery exposed read-only GitHub actions;
Git CLI could not resolve github.com. No remote push or new-commit CI/deployment
success is claimed. A local commit and exact-base patch preserve the changes.
The existing local-studio workflow has a bounded mannequin review step ready
for when the commit can actually be published; permissions/settings unchanged.

Evidence: `renders/humanoid-review/review.json`, pose/proportion boards, case
images and GLBs; local logs and rejected trials in the saved evidence bundle.
[API](../humanoid-foundation.md) / [source notes](../research/humanoid-foundation.md).

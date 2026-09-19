# Plain humanoid shot candidate

Base main: dabc5272dd20d60e5a6ca57f3d8ba54b6211c8c4, exact locked kit tree
71fa5d9c347247b62e131d1a0c2fdc3c151023e4. Prior local humanoid tree
5791daee8cf48872582e67a8a9576aeec04060f7 recovered exactly before edits.
The containing published commit is this implementation revision. The runtime
clock reports September 19 while the conversation date is September 20.

The preceding response had changed old detailed-scene defaults in a stale
workspace. Those changes are NOT included. Latest main and all its pose/armor
work are preserved. The new work occurs only in the original plain humanoid
and its dedicated shot study. Its original gallery default remains T-bind.

## Actual checks

- `npm run doctor`: Three.js r186 / Chromium 144.0.7559.96 / SwiftShader WebGL2.
- `node --test --test-concurrency=1 tests/humanoid-shot.test.js tests/humanoid-mannequin.test.js tests/export-skin-roots.test.js tests/two-link-pose.test.js tests/rigging.test.js tests/shot-rig.test.js`: 23/23 passed.
- `npm run build`: 45 recipes, passed.
- `npm run test:render`: LOCAL_RENDER_OK, actual 20-view Chromium regression;
  the separate legacy skinned fixture has 0 errors / 6 existing warnings.
- `node scripts/review-humanoid.mjs renders/foundation-check`: resumed foundation
  review completed 7 cases / 65 images / 3 valid GLBs before new pose controls.
- `node scripts/review-mannequin-shot.mjs`: final 6 cases / 24 images / 2 GLBs,
  each 0 errors / 0 warnings. Hero material/clay/silhouette, skeleton overlay,
  front/threequarter/side/back clay/wire, bind-view export. Both GLB files are
  byte-identical despite different previews. Two hold clips export from T-bind.
- Imported versus source skin: 136 sampled vertices in each of baseline/shot,
  maximum position error 5.245970696723831e-8 m.
- All shot cases share computational fingerprint
  6ae1a82b279ed973824ee06639552adbcae943ecfc11edea74ee6e2996ed43b8.
  Documentation/CI additions do not change that computational fingerprint.

No completed full local suite or native Blender test is claimed. New-commit
CI/Pages are pending at this checkpoint, not inferred from local validation.

## Pose and proportions

Both shot comparisons use the same 1.8 m proxy with .35 m shoulders and .17 m
hip sockets, .414/.486 m leg links and .17 m ankle datum. Arm links are
.306/.270 m. This deliberately differs from the old generic proportions and is
an artistic hypothesis; no optical module is redefined as a skeletal joint.
The elevated ankle/foot mass is a blockout allowance, not anatomical truth.

The pelvis is shifted left relative to the planted feet; first-spine bend and
chest counterrotation are separate; head orientation is set in model space,
not camera-facing. Hand targets remove the symmetric automatic hang. Joint
translations, link lengths and bind matrices stay fixed during posing. Default
proportions and generic poses remain available; the detailed android is neither
rebound nor replaced. Same 11,968 triangles / 34 skinned meshes / 2 materials /
0 textures in each shot pose. No new normal bake or shader.

## Inspection and rejected trials

Inspected the reuploaded reference, hero material/clay, silhouette and side/back
views. The candidate has a clearer leaning leg line, counterposed rib/pelvis and
head tilt than the generic lookback pose. The far arm, raised near knee, waist
surface overlap and mitten/foot proportions remain imprecise. Do not call the
pose finished or hide these limitations under a costume. No statistical
reference resemblance score is claimed: historical annotations describe optical
features, not this naked skeleton.

Trials 1/2 used too-low knee placement and an opposite shoulder slope; trial 3
moved the upper body too far screen-left. Trial 4/5 adjusted pelvis span/roll and
trial 6 added the explicit waist bend used in the final review. Unreachable
hand/leg targets threw normally; they were adjusted, never clamped or stretched.
A swivel diagnostic revealed that placing a knee closer to a desired screen
point can turn it anatomically backward; that solution was not used. Trials,
parameters and logs are preserved outside source history in the evidence zip.

The reference reupload's SHA-256 is
8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f,
not the historical 127f0f... encoded original. It was visually inspected and is
not stored in Git. The existing prism annotations and uncertainty are unchanged.

Next: review the plain near-knee/hip relationship and far-arm depth under the
same camera, then make a single costume attachment only after pose review.

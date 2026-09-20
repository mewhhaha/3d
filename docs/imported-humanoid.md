# Pose the actual Mixamo example, not another proxy

**Current direction:** [upright standing correction](standing-pose.md). The user
rejected the exaggerated shoulder/chest twist. Use the new `upright` clip for
active pose review; previous candidates remain available for comparison.

`studies/imported-xbot.js` loads **Adobe/Mixamo Xbot** from the public, explicitly
credited Three.js additive-skinning example. Its 67-bone skeleton, two skins,
49,112 triangles, UVs, weights and materials are third-party work. The workshop
adds pose controls and a shot; it does not claim to have replicated Adobe's
mesh, auto-rigger or animation library. The original code-authored mannequin and
detailed android remain unchanged.

This is optional local authoring input, **not** a new default gallery dependency:

```sh
node scripts/prepare-xbot.mjs
node scripts/render.mjs studies/imported-xbot.js --pose upright --time .5 \
  --views hero,side --passes material,clay,silhouette --out renders/xbot
node scripts/review-imported-humanoid.mjs
```

Preparation pins the Three.js r186 commit, Git blob and byte length, records
SHA-256/provenance, and caches the input under ignored `vendor-src/`. It is not
an authenticated download from Adobe, nor an unverified Sketchfab reupload.
The full Mixamo character library requires Adobe sign-in. See `THIRD_PARTY.md`.
Raw input and derived evaluation GLBs do not enter this repository's source or
Pages/gallery. CI review artifacts contain images and verification JSON only.

## Existing-skeleton authoring

`skeletonPose(root, {names})` operates on a freshly owned skeleton, captured in
its authored rest pose. The optional dictionary maps semantic roles to **existing
node names**; it does not rename or rebuild bones. Names must be unique and safe
for Three.js track binding. Angles are degrees. Targets/offsets are world-space
position units; with this imported sample's .01 armature they are meters.

```js
const controller = skeletonPose(imported, {
  names: {upper: 'mixamorigLeftArm', elbow: 'mixamorigLeftForeArm',
          wrist: 'mixamorigLeftHand'},
});
const stance = controller.hold('study', pose => {
  pose.solve({root: 'upper', joint: 'elbow', tip: 'wrist',
              target: [.1, .95, .2], pole: [.4, 1.2, -.3]});
  pose.twist('elbow', 'wrist', 35);
});
```

`rotateLocal` adds an authored-axis rotation; `rotateWorld` adds a world rotation;
`orientWorld` supplies an absolute orientation. `translateWorld` shifts a joint.
`twist` rotates around the current from/to axis. `solve` uses the existing
fixed-length two-link solver on direct parent-child bones and rolls back on
failure. World orientation requires positive uniform ancestor scale; imported
nonuniform/sheared ancestry is not solved. This is not a joint-limit, collision,
physical balance, finger-contact or animation-retargeting system.

`hold` starts from captured rest, writes complete bone position/quaternion/scale
tracks and restores the caller's previous pose in `finally`, including failed
experiments. These clips are static pose holds, not motion capture or walking.
The imported source's original clips stay in the verified cache; the study
exports the workshop-authored clips `neutral`, `confident`, `poised`,
`silhouette`, and `upright`.

## Import/preview/export correctness

The actual sample exposed a real runtime bug: `Skeleton.pose()` reconstructs a
root bone's local transform without accounting for a scaled **non-bone parent**.
Calling it in the renderer applied the armature unit scale twice. Preview now
captures and restores the builder's local bone TRS through `captureBonePose()`
instead of reconstructing it from inverse binds. No skin/inverse-bind buffer is
rewritten. A synthetic scaled-armature test reproduces the failure independently
of the downloaded model.

The pinned Xbot skins already use identity model-space bind matrices and local
transforms. The importer moves these childless skins out of the scaled armature
while keeping the bone hierarchy and its unit conversion. The existing explicit
export-skin-root stage can then export them at true scene roots. This is a
**sample-specific verified layout correction**, not an arbitrary FBX normalizer.
Tests compare all 28,374 deformed vertices before/after this change for rest,
`idle` and `walk`, and reimport all authored clips after GLB export. Original
geometry attributes, indices and bone inverse matrices remain unchanged.

Each study build owns cloned geometry/materials and a correctly cloned skeleton.
The upstream `SkeletonUtils.clone` alone shares geometry/materials, so those
resources are explicitly cloned too. The sample has no textures; an unknown
textured asset needs independent texture ownership, not blind use of this loader.

The reference pose is still an artistic study. One straightened support leg,
a relaxed other knee, hip/chest opposition, hand roll and a raised chin make its
intent clearer, but the stock proportions, shoulder/waist gaps and faceless head
are not an accurate recreation of the supplied illustration. Establish that
plain silhouette before fitting the existing robot costume to this skeleton.

## Whole-body edits with pinned end effectors

The study now also exports `poised`, while `neutral` and `confident` remain
unchanged. It uses [withPins](skeleton-pins.md) to change pelvis/chest opposition
and clavicle attitude without sliding or reorienting the existing hand/foot
frames. The source proportions and all skin buffers remain those of Xbot.

```sh
node scripts/render.mjs studies/imported-xbot.js --pose poised --time .5 \
  --views hero,side --passes material,clay,silhouette
```

This is a reviewed pose candidate, not a likeness/balance certification. The
stock head, rib/waist/pelvis shape, far-arm overlap and segmented joints still
limit the match. No costume or new shading has been used to hide them.

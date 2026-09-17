# Connected limb poses and scalloped limb construction

Base: `025dbec2ee7045eb4d3aa02d38b722208beefa63`. The source and locked dependencies
were recovered from authoring-kit run `35259243357`, artifact `10514530399`, then
its journal-only follow-up was applied. The initial local Git tree exactly matched
remote tree `dd8c60ccfe1482566f51c259adafe743f3cb63bb`. Main was reread before writes.
The containing implementation commit identifies this checkpoint; final reviewed
source fingerprint is `817986ac52aadbda120fd77104a9f017a32065953cbead6a4dab5de373440c12`
(209 files), identical across all eight final review cases.

## Accepted capability and examples

`twoLinkPose` is a pure root/target/length/pole/swivel position solve, used by both
android arms/legs and an independent mechanical inspection boom. It keeps both
segment lengths fixed and refuses unreachable targets rather than stretching.
Existing rigid segment mounts consume the common joint on both adjacent links.
This replaces the local-only loose mesh-warp experiment, not the published pose.

`limbStyle: scalloped` reconstructs tapered thigh, calf, upper-arm and forearm
supports with concave plates and support-mounted ports. Old cylinder-specific
seams, floating details and cores are removed only in the new variant. Sloped
instep/toe shells, ankle forks, bellows and shaped outsole replace the flat boot.
The outsole's -0.0435 m local datum lands on the unchanged 0.155 m platform deck.
Head, torso construction, camera, lights, hair bake, reactor and cables are unchanged.

`poseStyle: relaxed` is independent from limb geometry and remains opt-in. It moves
the near wrist target 9 mm toward its shoulder and solves both links; near elbow
flexion changes 8.0754 -> 22.3638 degrees. Pole swivels change bend direction on
both arms and legs; knee flexion stays 31.9143/11.8199 degrees. Both feet receive
small planar splay (near +6, far -7 degrees). Hip/shoulder/ankle/head/torso/reactor
anchors remain fixed. The original reference pose and all legacy defaults remain.

## Actual local checks

- `npm run doctor`: Node 22, Three.js r186, Chromium 144, SwiftShader WebGL2/Xvfb.
- `node --test tests/two-link-pose.test.js tests/prism-limbs.test.js tests/prism-torso.test.js tests/surface-contour.test.js tests/reference-constraints.test.js`: **15/15 passed**.
- `npm run build`: **44 recipes**, passed.
- Targeted `cyber-form-study` model default/determinism/parameter extrema: **1/1 passed**, approximately 43 seconds.
- Bounded `timeout 180 npm test`: exit **124**, 160 passing subtests and no reported failures before timeout; not a completed full-suite pass.
- `node scripts/review-limbs.mjs renders/limb-review-accepted`: **8 cases / 41 renders**, including three-way locked hero comparison (previous / shapes only / shapes + connected pose), alternative-view clay/wire limbs and boom pose comparison.
- Four GLBs: **zero errors / zero warnings**; all validator infos retained.
- Regressions prove upper/lower links share endpoints within 1e-10 m, exact authored lengths, independent buffers, outward ankle-fork normals, and sole/deck contact within 1e-7 m. Existing torso transform invariance tests were not weakened.

Scene before: **618,996 triangles / 626,710 vertices**. New scene: **621,196 / 627,684**.
Legs before: **165,688 / 131,578**; after: **177,264 / 146,204**.
Arms after: **144,888 / 147,742**. Both boom poses: **1,128 / 789**.
This is new limb topology, not normal baking or topology-preserving sculpting.

## Inspection and honest tradeoffs

Inspected actual full material/clay/silhouette, three-view leg clay/wire, side arm,
and independent boom renders. Horizontal cuff-like cuts are replaced by longer
flowing covers, fuller upper calves, narrower ankles and real cutouts. The new
boots have a visibly sloped instep rather than a flat shoe lid. The near elbow is
less locked, but the whole body's line of action is still too stiff and regular.
Shoulder-to-upper-arm overlap, smooth broad thigh plates, large simple hip balls,
and blocky sole edges remain visible defects. Hidden-side shell/core openings are
not finished watertight anatomy or an inferred reconstruction of unseen artwork.

Manual landmark RMS increases **7.861070 -> 11.163241 px**, max **17.959271 -> 24.749533 px**
with the connected pose. Near elbow and shoulder exceed their annotated uncertainty.
This is explicitly a visual/pose tradeoff, not an improved reference score; the
reference annotations are untouched. Shape-only comparison is retained separately.
The reuploaded artwork is visually available, with encoded SHA-256 `8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`,
not the historical original-file hash. No raster is published in source history.

Rejected the previous local-only disconnected rotations/curve warps and its
silent skipping of unsupported geometry. They are not in main or the new API.
During this pass, an inverted ankle-fork normal was found and corrected in geometry;
a dedicated outward-normal regression was added. The complete review was rerun
under one final fingerprint after that fix; earlier mixed-fingerprint/trial outputs
are not the accepted evidence. Early foreground command timeouts closed Chromium;
finite detached processes completed the real reviews without changing renderer code.

## Sources, export and next target

See [connected limb research](../research/connected-limb-poses.md) and
[two-link API](../two-link-pose.md). Blender's documented target/pole distinction
informed the solver; Kaspar's written pose-polishing note informed separating
pose and volume corrections. No videos were claimed watched, no tutorial assets copied.

Artifacts: `renders/limb-review-accepted/` locally; CI runs the same script under
`renders/limb-review/` inside `guided-form-review`. Each case saves report/PNGs and
applicable GLB/validation JSON. Custom head two-tone rendering retains its existing
standard-PBR GLB fallback. No new Blender/skin/animation certification is claimed.
Prior base `025dbec` Pages build, native jobs and deployment were verified successful;
new commit CI must be inspected separately.

Next: shoulder/elbow integration, asymmetrical pelvis-to-thigh transitions and
stronger torso gesture with connected attachment constraints. Avoid adding detail
to conceal a still-stiff mass relationship. Solver joint limits, self-collision,
skinning and automatic center-of-mass balance remain separate work.

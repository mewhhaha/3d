# Automated refinement progress

## 2026-09-20 — keep the humanoid simple; control its supporting leg

Base **682d7e1265a1315ffe47dbe40c94fae01c357407**, reconstructed tree
`e5f18299306f8e9bd8e580731b9e8dccb23f435c` verified exactly. Resumed the existing
28-bone mannequin; did not duplicate it or restore the stale armor patch.

New bounded `slideRootForBend` plus optional `pose.support` separates knee
extension from fixed foot placement and bend-plane choice. The explicit `stance`
clip changes pelvic counter-roll and gives the Left leg 14 degrees of flexion
instead of 34.0193, retaining ankle/wrist targets and all bind geometry/weights.
The other knee stays relaxed at 25.5802 degrees. No costume, texture or triangle
increase. Same controls work on slender/broad builds and an independent slider
boom; the old generic mannequin presets and detailed android remain unchanged.

Local doctor, **24/24 expanded tests**, **40/40 local-studio unit tests**, targeted
model **1/1**, **45-recipe build** passed. New support review: **11 cases / 32
renders / 4 zero-warning GLBs**. Shot review and generic foundation rerun: **24
and 65 images**, all five exports zero-warning; actual skin reimport max error
<5.25e-8 m. All reviews share fingerprint
`acbc6346104622d81ec884f8a3c12e23b2a7f8f11c796ffe58bb0800762a1abe` (258 files).
Full suite bounded at 180s after **193 passing subtests** (exit 124), not a
complete pass. Base local-studio and Pages CI verified successful; new commit
CI pending at checkpoint. No Mixamo asset/retargeting or native Blender claim.

[API](support-leg.md) · [Adobe/Blender source notes](research/mixamo-foundation-and-support.md) ·
[checks, rejected request and limitations](checkpoints/2026-09-20-support-leg.md).
The new plain stance is still a draft: rib/pelvis masses, shoulder/waist joins,
mittens and foot placeholders need work. Keep costume and neon paused. Next is
plain body proportion refinement, not further armor detail.

## 2026-09-20 — resume the plain humanoid and pose it for the shot

**Published and verified:** implementation commit **75f7dabcdace383596255669cc6e4ea3f7c27b4c** is on main. Local-studio run **35474063615** completed successfully, including both mannequin reviews. Downloaded artifact **10593722980 / local-studio-review** independently contains 24 shot images plus 65 foundation images, with all five GLB exports reporting zero errors/warnings. The CI shot hero PNG is byte-identical to local, SHA-256 `57d70185f66b2f2e02bdb3e63767af948c2688967ba0c1f38e02a590c3a856a5`. Final generic-foundation review was also rerun locally after all pose changes. Targeted recipe default/determinism/parameter test: **1/1 passed**. Full local suite ended at its 180s bound after **187 passing subtests**, not a full-suite pass. No Pages or native Blender appearance claim.

Verified remote main **dabc5272dd20d60e5a6ca57f3d8ba54b6211c8c4**, exact base
tree **71fa5d9c347247b62e131d1a0c2fdc3c151023e4**. Recovered the actual previous
humanoid source (tree **5791daee8cf48872582e67a8a9576aeec04060f7**), not the stale
flow/default-switch experiment. Base full form CI passed. This checkpoint
publishes the previously unpushed foundation plus a new plain-rig shot study.
Do not restore old cyber recipe defaults or disguise a preset switch as posing.

Reusable controls: separate bind leg/ankle/shoulder dimensions; optional waist
rotation, model-space head orientation, normalized per-limb endpoint/pole targets.
The same connected 28-bone rig solves the entire body. The shot's baseline and
candidate use identical geometry (11,968 triangles, 34 skins, two PBR materials,
no textures). Original mannequin defaults and detailed android remain intact.

Local doctor; **23/23 expanded tests**; **45-recipe build**; actual Chromium
render/export regression passed. Its unrelated old skinned fixture retains six
warnings, not suppressed. New shot review: **6 cases / 24 images / 2 GLB exports,
zero errors and warnings**; bind and posed-preview exports byte-identical.
Reimport: 136 sampled vertices per pose, maximum error <5.25e-8 m. The existing
foundation review also completed **7 cases / 65 images / 3 validated GLBs**.
No full-suite pass, native Blender result or Pages deployment is claimed here.
Final-commit CI is pending until the authorized push is inspected.

The reference reupload is available (encoded hash differs from the historical
original-byte hash); no raster or changed target annotations enter source.
The new silhouette has a clearer pelvis shift, torso counterturn and head tilt,
but shoulders, mitten hands, foot placeholders and waist overlap still need
refinement. This is a reviewable shot candidate, not an accepted exact pose or
balanced/collision-correct character. No new shaders, normal bake or costume.

[Pose API](mannequin-shot.md) · [source notes](research/mannequin-shot.md) ·
[checks and rejected trials](checkpoints/2026-09-20-mannequin-shot.md).
Evidence: `renders/mannequin-shot-review/` and `renders/foundation-check/`;
CI artifact: `local-studio-review`. Keep generated images/models out of Git.

Next: judge the **plain** silhouette against the illustration, especially the
near-knee height, far-arm depth and head/neck relationship. Keep costume work
paused until those primary decisions are convincing. Pose/contact validity and
visual resemblance are different checks.

Prior journal preserved verbatim:
[journal through dabc527](checkpoints/automation-progress-through-dabc527.md).
The earlier local humanoid provenance, checks and publishing blocker remain in
[its historical checkpoint](checkpoints/2026-09-19-humanoid-foundation.md).

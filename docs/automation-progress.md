# Automated refinement progress

## 2026-09-20 — resume the plain humanoid and pose it for the shot

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

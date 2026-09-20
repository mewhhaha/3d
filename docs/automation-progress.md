# Automated refinement progress

## 2026-09-20 — pin contacts while editing the actual imported body

Base **631e1ecb94b1a10580c386385910b72db26f498c**, exact tree
`176e4e24856def975bc90d8d4ef101a516cd2650` verified with current GitHub and kit.
The containing commit is this implementation revision. Continued the actual
Adobe/Mixamo Xbot, not another reconstructed base or a stale armor experiment.

New `skeletonPose.withPins()` preserves hand/foot end frames through body edits,
checks fixed lengths and rolls back the entire bone state on failed solves.
The `poised` candidate changes pelvis/chest opposition, clavicles and head tilt;
old clips, stock geometry/weights and detailed android stay unchanged. An
unrelated inspection arm and original broad humanoid exercise the same operation.
**49,112 triangles**, unchanged, no new textures/shaders/normal bake.

Local doctor; **34/34 expanded tests**; targeted model **1/1**; **45-recipe build**;
actual runtime regression passed (legacy hand retains six warnings). Final
review **9 cases / 43 images / 4 zero-warning GLBs**, three complete imported
skin reimports (28,374 vertices each, max error 3.30e-10 m), byte-identical bind
exports across preview clips. Four retained frames differ by <8.45e-9 m.
Fingerprint `4ece7099e6ffc3562d20bd88273d834f91029cbe074226a7fe2bf614c88143cc`
(266 files). Full suite bounded at 180s after **193 passing subtests**, not a
complete suite pass. New-commit CI pending at checkpoint.

The stronger countercurve is a modest visual change. Stock rib/head proportions,
far-arm overlap and segmented gaps remain wrong for the reference. Pose variants,
failed outer-timeout reviews and the normalized quaternion metric correction
are recorded rather than hidden. Keep costume off until the base is convincing.

[API](skeleton-pins.md) · [artist sources](research/posing-with-held-contacts.md) ·
[exact checks and limitations](checkpoints/2026-09-20-pinned-acting.md).
Evidence: `renders/poised-final/`; existing CI artifact `imported-humanoid-review`.
No Mixamo auto-rigging/retargeting, physics, native Blender or Pages claim.

Next: plain torso-to-leg proportions and far-arm/hand silhouette on this base.
All prior progress is preserved verbatim in
[journal through 631e1ec](checkpoints/automation-progress-through-631e1ec.md).

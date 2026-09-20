# Automated refinement progress

## 2026-09-20 — correct the overtwisted pose interpretation

Base **1a5175e3605304e0b1ab1bc908793ee98f550378**, exact locked tree
`63c225440d3c2230278cc193ec35d31547741c1d` verified through GitHub. The user
explicitly wants upright standing, pelvis pushed out, arms at the sides and head
down, not the previous dramatic shoulder/chest twist. The containing commit
adds `upright` from rest with existing pose operations: one body heading,
independent downward head pitch and shoulder-relative gravity-hanging arms.
Old clips stay as comparisons; no mesh, body proportions, rig, UV, weight,
material, reference annotation or camera change. Ankle positions stay fixed,
while wrist targets and foot yaw intentionally change. Same **49,112 triangles**.

Local doctor; **40/40 relevant tests**; **45-recipe build**; actual renderer
regression passed (unrelated legacy hand retains six warnings). Final new review:
**6 cases / 26 images / 3 zero-warning GLBs**, complete skin reimport in five
clips (<8.70e-8 m), identical bind/posed-preview exports. Stock and tailored
forms both exercise the correction. Fingerprint
`2d3681ffc5aa97d68dc4b7d99957784f89f03c846c8ee191222f50c9e8627bc0`.

Actual material and four-angle clay inspection shows a more upright torso,
level shoulder heights, arms along the sides and a lowered head. These are not
an exact likeness or physical-contact guarantee. First wrist placement was too
far back; rejected and revised. Heading trials retained for comparison. The
first old-review retry failed on an outer browser-startup bound, not geometry.
The complete final rerun passed both prior reviews (43 and 48 images; seven valid
exports). Full npm test remained incomplete at 180s with 193 passing subtests.

[Current pose guidance](standing-pose.md) · [research](research/upright-pose-orientation.md) ·
[exact checks/rejections](checkpoints/2026-09-20-upright-correction.md).
Evidence: `renders/upright-final/`; CI runs `review-upright.mjs` and publishes
images/reports only. Base imported CI and Pages passed; new-commit CI pending at
checkpoint. No new shader, normal bake or costume-fitting claim.

Next: stay with the simple corrected stance; check remaining arm/hip contacts and
pelvis displacement rather than another invented torso countertwist.

## 2026-09-20 — refit rest proportions before posing the imported skin

Base **60b87b41b45d58820d8d6af41efe718102268aa1**, exact locked tree
`e7db2d640a8854dd4c2dfc209bf2f1f243ae17b8` verified through GitHub. Continued the
actual Xbot rather than restoring a stale mannequin or detailed armor snapshot.
The containing commit is the implementation revision.

New `refitSkinBind` applies one field to rest geometry AND rest joints, transports
normals, retains topology/UVs/weights, and computes fresh inverse binds. Tangents,
old clips, morphs and dependent baked maps are not silently reused. Optional
`form: tailored` lengthens the leg chains about 7 cm relative to the torso and
reduces torso bulk. New `silhouette` independently lowers/clears the far arm.
Old stock and pose variants remain available. Same operation refits an unrelated
four-bone flexible tail before authoring its bend. **49,112 Xbot triangles**,
unchanged; no new shader, texture, normal bake or costume.

Local doctor; **40/40 expanded tests**; targeted model **1/1**; **45-recipe build**;
actual runtime regression passed (legacy hand's six warnings retained). New
review: **11 cases / 48 images / 3 zero-warning GLBs**, full-vertex skin reimport
in all four clips (<8.70e-8 m). Existing stock review also completed **43 images /
4 valid exports**. Both reviews share fingerprint
`4b01c88fc16a1e06124498013271aa8d20bb47493a95c185d11ff6e2fa9ec9e6` (270 files).
Full local suite bounded at 180s after **189 passing subtests**, not a full pass.

[API](refit-skin-bind.md) · [source notes](research/rest-shape-and-skin-bind.md) ·
[checks, rejected trials, limitations](checkpoints/2026-09-20-bind-form.md).
The leg/torso ratio and far-hand contour improve locally; the stock head, segmented
waist/shoulders, feet and overall attitude still differ from the illustration.
The refit is deliberate changed bind data, not unchanged bone lengths or motion
retargeting. Keep costume off until the plain form/pose is convincing.

Evidence: `renders/bind-form-review/`, `renders/stock-final-review/` and logs.
Existing imported CI runs both reviews; final-commit CI/Pages pending at source
checkpoint. No raw/derived third-party meshes enter Git/Pages/CI artifacts.
Next: rib/neck and hip/thigh transitions on this explicit refitted bind.

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

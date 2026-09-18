# Automated refinement progress

## 2026-09-18 — connected hands and cutaway ceramic contours

Verified base main **ea8140309c5e176c111382f36d332766aa6f04df**, successful
Guided Form and full Pages workflows, and exact offline source/locked dependencies.
The containing commit adds reusable `rigidChain` (local -Y links, parent-relative
XYZ-degree rotations) used by mechanical digits and an unrelated opposed-jaw gripper.
Optional `handStyle: relaxed` adds arced knuckles/individual curl; independent
`panelStyle: cutaway` splits chest cover and opens a proximal thigh recess. Existing
pose, lengths, wrist/palm emitter, head, feet, camera and all defaults remain fixed.

Local: doctor; **7/7** new focused and **32/32** expanded tests; targeted recipe
**1/1**; build **44 recipes**; **10 cases / 50 renders / 3 GLBs, zero errors and
warnings**. Full `npm test` reached **165 passing subtests** before its 180 s bound
(exit 124), not a complete local suite. Computational source fingerprint
`41f29155c8855518f8302ed99324c05b18e87a12103a1797360f3ce0ff280058`
(223 files), identical throughout final review. Scene **687,828 triangles**;
landmarks unchanged at **9.8003 px RMS / 25.9151 px max**.

Actual material/clay/side views show a cupped, less regular hand silhouette and
real chest/thigh openings. This is local modeling progress, not solved likeness.
A shallow hidden notch and an interrupted reused-browser review were rejected;
final review uses existing isolated browsers with no error suppression.
Research, checks, limits, reference provenance and artifact paths:
[hands checkpoint](checkpoints/2026-09-18-prism-hands.md).
Next: boot/ankle/lower-shin construction, preserving planted contact. New-commit CI
and Pages pending at checkpoint; separate from the successful local checks.

## 2026-09-18 — humanoid mass groups beneath mechanical armor

Base main **35bdce30e1a07cc70ba357a9f2dde9fd924df8f9** and its successful CI/Pages
were verified via GitHub. Exact kit recovered; the previous local-only old snapshot
was not promoted. The containing commit is the code revision for this pass.

Extended existing `radialMass` with a longitudinal angle profile, preserving scalar
angle behavior. Optional `massStyle: sculpted` uses quads/calves/deltoid/rib/iliac
volume groups beneath shared armor supports; a spiral mechanical grip demonstrates
independent reuse. Camera, head, joints, lengths, planted feet and all old defaults
remain unchanged. Shapes and attachments are rebuilt from shared supports, not
warped as disconnected finished meshes.

Actual checks: doctor; **19/19** focused / **30/30** expanded tests; targeted recipe **1/1**; build **44
recipes**; **8 cases / 44 renders / 3 GLBs with zero errors and warnings**. Full
`npm test` reached **165 passing subtests** before a 180-second timeout, not a full
local-suite pass. Source fingerprint across all final cases:
`13266e51763005ee0e0c449e28f905ab8490c702c7512029d33f8d7ff8e5c9ba` (218 files).
Landmarks unchanged at **9.8003 px RMS / 25.9151 px max**. New scene **658,572
triangles**. No normal-bake or skinning claim.

Actual clay review shows better shoulder-to-upper-arm taper and less cylindrical
thigh/calf and rib/waist forms. Full-frame improvement remains modest. Broad armor,
hands, head and reactor still need modeling; no exact likeness claim. CI pending
at checkpoint; final-commit results are separate from local checks.

[Full evidence, sources and limitations](checkpoints/2026-09-18-prism-masses.md).
Next: ceramic contour structure and relaxed hand silhouette, not decorative density.

## 2026-09-17 — connected body counterpose and joint interfaces

Base main `9ec8e2a50cb5f5e71404a830f66b67f298e63ffc` and its exact kit were
verified. Its form review and full Pages build/native jobs/deployment succeeded.
This containing commit adds `sectionPose`: independent section transforms shared
by a continuous support and rigid sockets. Android ribs/waist/pelvis and an
unrelated duct/flange assembly exercise it. New `gestureStyle: counterpose` re-solves
whole limbs at old lengths to old wrist/ankle targets; separate `jointStyle: housed`
adds hip/elbow cowls and shoulder clearance. Old defaults/head/camera/feet/reactor
are preserved. No skipped-geometry or disconnected armor-only warp was promoted.

Local: doctor; **22/22** focused tests; build **44 recipes**; targeted model **1/1**;
final review **7 cases / 39 renders**, three GLBs **0 errors / 0 warnings**. Full
suite hit its 300-second bound after **184 passing subtests / zero reported failures**
(exit 124), not a complete local pass. All final cases share fingerprint
`f792732c540b96dcffd2e9797bc4cb0d103b0ad7ef547f716d05b3ad05f7b6a9`.
Scene **643,084 triangles**. RMS landmark error **11.1632 -> 9.8003 px**, maximum
**24.7495 -> 25.9151 px**; annotations unchanged. This is not likeness acceptance.

Actual clay/alternative views show a clearer waist countercurve and geometric
socket surrounds; full-scene change is modest. Stronger pelvic shift causing a
splayed far knee was rejected. Rear shoulder integration, smooth trunk, broad limb
plates and regular reactor/cables remain substantial defects. Research, exact
checks, artifacts and limits: [gesture checkpoint](checkpoints/2026-09-17-prism-gesture.md)
and [section pose API](section-pose.md). Generated evidence is under
`renders/gesture-review/`, not Git. New-commit CI pending; inspect it independently.

## 2026-09-17 — connected limb poses, tapered shells and planted boots

Base main `025dbec2ee7045eb4d3aa02d38b722208beefa63` was verified through connected
GitHub; exact source/locked dependencies recovered from its parent kit plus the
journal-only follow-up. Base Pages build/native jobs/deployment are now verified
successful. The containing commit adds this implementation; source fingerprint
`817986ac52aadbda120fd77104a9f017a32065953cbead6a4dab5de373440c12` is identical across
all final render cases.

Reusable `twoLinkPose` separates fixed root/target/lengths from pole/swivel intent.
Android limbs and a mechanical inspection boom exercise it. New optional
`limbStyle: scalloped` reconstructs profiled limbs, concave armor and sloped boots;
independent `poseStyle: relaxed` solves connected joints without changing lengths.
All published default variants remain unchanged. The previous local-only object
warp experiment was not promoted; its disconnected joint behavior and skipped
geometry are rejected rather than hidden by weaker tests.

Actual local checks: doctor; **15/15** focused regressions; build **44 recipes**;
targeted recipe **1/1**; final review **8 cases / 41 renders**, four GLBs **0 errors /
0 warnings**. Full npm test reached 160 passing subtests before its 180-second bound
(exit 124); no complete full-suite pass is claimed. New scene **621,196 triangles**.
Near elbow flexion **8.0754 -> 22.3638 degrees**; feet remain on the .155 m deck.
Joint continuity, fixed lengths, UV ownership and outward ankle-fork normals have
explicit tests. No new hair bake or rig claim.

Actual material/clay/wire/alternative-view inspection shows longer flowing limb
plates instead of horizontal cuffs, fuller calves/narrower ankles and a sloped boot
instep. Overall posture, shoulder overlap, pelvis/thigh transitions and smooth broad
shells still need work. Landmark RMS worsens **7.8611 -> 11.1632 px**, max **24.7495 px**
for the relaxed variant; annotations are unchanged and the original pose is retained.
No final likeness claim. Detailed sources, rejected experiments, exact commands,
artifact locations and limitations: [limb checkpoint](checkpoints/2026-09-17-prism-limbs.md).

New implementation CI is pending at this checkpoint. Component CI, Pages, native
Blender appearance and visual likeness are separate statuses. Next target: connected
shoulder/elbow integration and stronger pelvis-to-thigh/torso gesture, not decoration.

All previous journal entries are preserved verbatim in
[the journal through 025dbec](checkpoints/automation-progress-through-025dbec.md).

# Automated refinement progress

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

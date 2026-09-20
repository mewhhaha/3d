# Body acting edits with retained contact frames

Accessed 2026-09-20; public written artist articles, not their embedded videos.

- Jay Jackson, **Solid Drawing: The 12 Basic Principles of Animation**,
  Animation Mentor, 2017-07-12:
  https://www.animationmentor.com/blog/solid-drawing-the-12-basic-principles-of-animation/
  The written discussion connects a whole-body line of action, avoiding mirrored
  arms, clear silhouette, and opposing hip/shoulder angles. Adaptation: keep the
  same plain imported body and compare a bounded set of whole-body pose edits,
  not additional geometry or a shader-only impression of confidence.
- Dana Boadway-Masson, **Pro Animation Tip: Don't Forget About the Shoulders!**,
  Animation Mentor, 2018-07-11:
  https://www.animationmentor.com/blog/pro-animation-tip-dont-forget-about-the-shoulders/
  The shoulders are described as expressive and as the upper drivers of the arm
  chain; torso motion propagates upward from the hips. Adaptation: adjust the
  clavicles and chest, then re-solve the arms rather than rotate disconnected
  limb pieces. No tutorial assets or illustrated examples were copied.

Implementation choice: add transactional hand/foot frame pinning to the existing
skeleton controller. The author chooses poles and edits; analytic two-link IK
retains endpoints and orientations. This is our adaptation, not a solver claimed
to come from either article. It does not calculate center of mass or know whether
a pose is confident. Visual assessment remains separate from endpoint accuracy.

Examples: real Xbot skin, original broad humanoid, and a non-humanoid inspection
mechanism. Final tests, side/back judgments, rejected trials and roundtrip results
are recorded in the pinned-acting checkpoint. Adobe/Mixamo provenance and import
limitations remain unchanged in THIRD_PARTY.md and imported-humanoid.md.

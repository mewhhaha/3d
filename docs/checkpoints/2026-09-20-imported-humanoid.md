# Actual humanoid import checkpoint

Base main dc3f5fa62bffee8a8a4037da0dd95a3bdf0fbbd5, exact recovered tree
19baf5d00eae578c8d8d3a50c2266fba8df75f10. The user requests the actual Mixamo
foundation (or equivalent rig), not further detailed robot construction.

The official Three.js additive-skinning example credits Mixamo and contains
Xbot.glb. Pin its r186 commit and Git blob, cache under ignored vendor-src, and
retain the attribution. This is an Adobe/Mixamo input, not workshop-authored
geometry or a new public-domain model. Do not add raw meshes to source history.
No login bypass or Sketchfab mirror is used. Adobe library access requires an ID.

This initial checkpoint removes a concrete local DNS/binary-download blocker
through a bounded GitHub authoring-input job. Syntax and invalid-input rejection
were checked locally; real download/parse/posing and visual approval are still
pending. The artifact expires after one day. Default builds remain offline and
unchanged. Follow-up work in the same pass will inspect the actual skeleton and
exercise reusable pose mapping, rather than assume name matching is retargeting.

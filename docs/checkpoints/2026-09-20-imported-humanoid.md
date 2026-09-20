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

## Completed follow-up in the same pass

The preparation commit is **6432d3915516ceefe5cb73b5e41116260eb162e2**. Its actual
GitHub job **35483158845** passed and supplied artifact **10596401584**. The sample
was downloaded, checksum-verified and parsed locally. SHA-256:
`002f8d269de68e5dce3d25195caf390d1aa359bbfaae3fcf4c8dc78ec36c3ba5`.
The containing follow-up commit is the tested implementation revision.

This is the actual 67-bone Adobe/Mixamo Xbot, including finger bones, two skins,
49,112 triangles, 28,374 vertices, two standard materials, and no textures.
All original geometry attributes, indices, weights and inverse bind matrices
are retained. Geometry, materials, skeletons and inverse matrices are independently
owned by each build. Original source animations remain in the input cache; the
study exports two new one-second held poses, neutral and confident.

`skeletonPose()` controls an existing skeleton without rebuilding or renaming it.
World-target two-link solves, world/local rotation, axial twist and translation
compose into a held pose, restoring previous state on failures. Same controls
are tested on the original procedural humanoid and a rotated/scaled synthetic
three-bone chain. The renderer now captures source LOCAL bone transforms rather
than applying `Skeleton.pose()` to an imported .01 Armature: that old reset
incorrectly applied the unit scale twice and produced a tiny figure. The first
bad render is preserved, not used as final evidence.

The sample's identity-bound model-space skins are removed from the misleading
scaled mesh-parent hierarchy while leaving the bone Armature intact. Existing
opt-in export-root layout then exports valid skins. This is verified for the
pinned sample, not claimed as a general FBX normalization algorithm. Every vertex
was compared with the unchanged source in rest plus original idle/walk poses:
maximum difference <5e-16 m. It is not a geometry simplification or a normal bake.

## Actual checks and visual evidence

- Final `npm run doctor`: Three.js r186 / Chromium 144.0.7559.96 / WebGL2 /
  SwiftShader, virtual display; passed.
- `node --test tests/skeleton-pose.test.js tests/local-render.test.js tests/humanoid-mannequin.test.js tests/humanoid-shot.test.js tests/humanoid-support.test.js tests/two-link-pose.test.js tests/export-skin-roots.test.js`: **29/29 passed**.
- `node scripts/review-imported-humanoid.mjs renders/imported-humanoid-final-review`:
  **5 cases / 24 images / 2 GLBs**, zero validation errors and warnings. Final
  computational fingerprint **020da1680f5ef7b49289dc865ed6bbcc8ecca15a51182b38dcbc2343912a1b8f**
  across 265 files. All cases share it. Material/clay/wire/silhouette and four
  viewpoints inspected; actual T-bind/skeleton shown separately.
- GLB reimport checks **all 28,374 vertices** for each authored pose, maximum
  position error **3.30e-10 m**. Bind and posed-preview exports are byte-identical.
- `node scripts/check-local-render.mjs`: **LOCAL_RENDER_OK**, preserving existing
  hand skin/render/export-isolation and dependency-freshness checks. The unrelated
  old hand fixture still has **six validator warnings**; not suppressed.
- Existing `review-humanoid.mjs` also completed **7 cases / 65 images / 3 valid
  GLBs** under the corrected renderer, without replacing the original mannequin.
- Final `npm run build`: **45 recipes**, passed; no imported default dependency.
- `timeout 180 npm test`: stopped at the explicit 180-second bound after **193
  passing subtests**, no reported failures before termination. Not a completed
  full-suite pass; the optional imported study is validated separately above.

The accepted pose turns the chest against the pelvis, keeps a 10-degree left
support-knee bend with the hip more nearly above that foot, relaxes the opposite
knee to 24.59 degrees, rolls hands inward and raises the chin. The stock mesh,
bind measurements and bone lengths are unchanged. This is a more deliberate
standing/look-back study, **not** a recovered exact illustration or physical
center-of-mass/balance solve. The head is still faceless, stock proportions are
not tailored to the android, and the shoulder/waist junctions are intentionally
segmented in the source model. Do not conceal these with costume yet.

Rejected: the first valid pose still displaced the hip too far away from the
selected supporting foot; a subsequent root/hand target adjustment improved the
stack. An earlier head pitch looked downward and was raised. Initial small-scale
render and pre-correction poses remain in local trial folders. Earlier reviews
are preserved separately; the final single-fingerprint review is the evidence
for this checkpoint. No original reference raster enters Git.

## Publish scope

[Workflow/API](../imported-humanoid.md) and
[research/provenance](../research/actual-mixamo-and-bind-frames.md).
The extended imported-humanoid CI downloads the pinned public input, checks the
controls and renders/reimports the actual model. Its artifact contains images and
JSON reports only, not a raw or derived third-party model pack. Final-commit CI
is pending at this source checkpoint. No Pages, Blender or arbitrary Mixamo
animation-retargeting success is claimed. Default workshop models and the older
detailed android are unchanged.

Next: judge this actual plain model's confident silhouette against the supplied
illustration, tune proportions/stance intentionally, then establish attachment
mapping for the existing robot costume. Do not rebuild the Mixamo base from
spheres or confuse this imported asset with the code-authored mannequin.

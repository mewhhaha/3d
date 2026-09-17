# Automated refinement progress

## 2026-09-17 — illustrated head, bounded shading normals and portable ink

Base main verified through connected GitHub: `86f3a2c7ddac5c4874d86bc8e95650dc8375b125`. Exact source and locked dependencies recovered from authoring-kit run `35237778146`, artifact `10503857036`. The containing commit identifies this implementation checkpoint. Prior local-only scene experiments were not on main and included missing limbs; they are not promoted. Absence of local `.git` was not a valid blocker to connected GitHub writes.

Capability: geometry-local normal direction with existing selection masks and an angle cap; separately owned reversed-winding ink hull; optional serializable two-tone WebGL look with explicit standard-PBR GLB fallback. Two actual users: a revised anime head and an unrelated service pod. The active `cyber-form-study` has an opt-in `headStyle: illustrated`, keeping `legacy` and all pose/camera/body/annotation defaults intact.

The illustrated head has a new rounded cross-section crown, separate geometric fringe and curtain cuts, reduced nasal bulb, cheek/socket relief, attached upper lids, revised far-eye placement and a small lifted mouth. No reference projection or generated concept image is used. The reuploaded 768x1376 reference is visually available, but its encoded SHA-256 is `8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`, not the historical original-file hash. No public annotation or hash expectation is changed; no reference raster enters Git.

Research and ownership contracts: `docs/research/illustration-normal-direction.md`, `docs/illustration.md`. Readable Blender normal-edit documentation informed bounded normal control; the official ASW announcement was accessible but the linked instructional PDF was not. Do not claim the Xrd talk was watched or this is its shader.

Local checks: doctor passed (Node22 / Three186 / Chromium144 / SwiftShader); final expanded focus **46/46**; build 44 recipes. The added mechanical fixture exposed a too-large slot bevel, then a nonindexed rounded-box input; both were corrected using a valid bevel and existing `compactGeometry`, not weakened contracts. The bounded full suite reached 160 passing tests with no failures before the 180-second timeout; no complete full-suite pass is claimed. The final review command and exact results are recorded in its artifact `renders/illustration-review/review.json`. Review includes locked before/after head and full scene, clay/wire/silhouette, PBR fallback, prop fixture, exported GLB validation and actual high-to-low hair measurement. Failed/interrupted larger-map trials remain under trial directories and are not accepted output.

Visual assessment: the old raised crown plug and oversized foreground slab are gone, both eyes read, and the nose no longer receives patchwork toon bands. The head is still a stylized draft: hidden-side/underside surfaces, crown-to-curtain transition, cut silhouette and facial likeness remain approximate. Body armor/boots/reactor are unchanged and still much too regular. A passed geometry/export check is not likeness acceptance. New variant stays explicit rather than silently replacing accepted legacy baselines.

Next target: validate the bob side/underside, then the torso/pelvis and major armor contours against the supplied view. Do not add decorative density to conceal those differences. Complete final-SHA CI inspection separately; the pre-existing full-gallery Pages failure is not certified fixed by this head pass.



### Completed local review

`node scripts/review-illustration.mjs` completed: **8 cases / 34 renders** and six exported GLBs, all **0 errors / 0 warnings** (validator infos retained). Revised head: **49,904 triangles / 26,378 vertices**. Revised full scene: **548,936 triangles / 581,051 vertices**. The mechanical fixture is **1,176 triangles** before and **1,764** after adding the explicit geometric ink shell.

Reference-alignment RMS changes **9.35666 -> 7.86107 px**, maximum stays **17.95927 px**; coarse hair-envelope IoU changes **0.910741 -> 0.913672**. These manual authoring annotations are not held-out likeness metrics.

New hair high/low/baked triangles: **130,368 / 14,656 / 14,656**. Position/normal/UV/tangent/index buffers are identical between low and baked. Independent 4096-sample normal errors, mean / p95 / max degrees: crown **0.19765 / 0.30470 / 0.40317**; curtain **0.18067 / 0.29783 / 0.32681**; fringe **0.17243 / 0.27717 / 0.32606**. These are new support surfaces, not a claim that legacy geometry is unchanged; normal maps cannot recover silhouette relief. The legacy fringe tail remains a separate unresolved baseline result.

Source fingerprint: `8c3ea1e7162ff4b54f8c5e0a9d5b1770fe904a15d4c0236efa42bd9a00f826cf`. Full actual reports, comparisons and rejected experiments live under `renders/illustration-review/` and the trial directories, not in source history.

Earlier journal entries are preserved verbatim in [the pre-illustration archive](checkpoints/automation-progress-through-86f3a2c.md).

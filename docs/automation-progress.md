# Automated refinement progress

## 2026-09-18 — mechanical feet, curved apertures and bounded scene transfer

Base main **72a534a1b7a9db52b22c6c6e10fc89de077aa3cf** and exact locked kit
verified via connected GitHub. The containing commit is this pass's code revision.

Extended `surfaceContourGeometry` with validated interior holes, exercised on
mechanical boot carriers and an unrelated curved bracket. Optional
`footStyle: bridged` adds a lower toe wedge, sloped instep, open heel guards and
perforated orange supports. Previous defaults, head, body/limb poses, wrist and
ankle origins, limb lengths, planted feet, lower-shin meshes and annotations are
unchanged. New independent contours/UVs are not a skin or normal bake.

The complete scene exposed Chromium's 100 MiB DevTools pipe limit. Bounded
JSON/JSHandle transfer fixes that concrete render blocker without simplifying
geometry. Original baseline material/clay/silhouette PNG hashes remain identical.
Errors and timeouts still propagate; total RAM and outgoing export size are not
solved. See [transfer contract](scene-transfer.md).

Actual final local checks: doctor; **42/42 expanded tests**; targeted model
**1/1**; **44-recipe build**; real Chromium render/rig regression; **7 cases /
34 renders / 3 new GLBs with zero errors and warnings**. The separate generic
skinned render fixture retains **6 warnings**, not suppressed. Bounded full
`npm test` ended at 180s with **165 passing subtests**, not a full-suite pass.
All final review cases share fingerprint
`bd3e3c82a942c9f2804d4b731ed7f2a98873866f6fea18490dc5eaecc5612f45` (228 files).
Scene **722,916 triangles**; landmark errors unchanged **9.8003 px RMS / 25.9151 px
max**. Mechanical validity is not likeness acceptance.

Actual side/clay inspection shows a less block-like outsole and more sloped foot
volume. Whole-image improvement remains modest. A protruding toe closure was
rejected and recessed. The body, head, reactor, cables and broad armor still
need substantial work. No reference raster entered source history.

[Full checkpoint, exact checks, source notes and limitations](checkpoints/2026-09-18-prism-feet.md).
Evidence: `renders/foot-review/`; new bounded CI artifact `foot-aperture-review`.
Final-commit CI/Pages pending at checkpoint; base combined form review was
cancelled at its last hand stage, not a full baseline review pass.

Next: whole-figure silhouette and shoulder/rib/pelvis relationships, with the
shin-to-foot connection reviewed in other views, rather than decorative density.

All previous entries are preserved verbatim in
[the journal through 72a534a](checkpoints/automation-progress-through-72a534a.md).

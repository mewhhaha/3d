# Automated refinement progress

## 2026-09-19 — connected shoulder girdle and cervical support

Base **45af342f6ba6b63d0f05d3745edb8f5dea755830** / exact locked tree verified
through GitHub. The containing commit is the implementation revision.
`bridgeSurface` adds an explicit cubic-Hermite span between source curves.
Optional `girdleStyle: connected` resolves torso/head/shoulder boundaries into
one frame, builds clavicular/scapular/trapezial spans, closes the top torso ring,
and seats the old emitters inside apertured cowls. All prior defaults, pose,
head, limbs, hands, feet, camera and reference data are unchanged.

The independent angled oval-to-round duct uses the same API. Local doctor,
**32/32 expanded tests**, targeted model **1/1**, **44-recipe build** passed.
Final review: **6 cases / 42 renders / 3 GLBs with zero errors and warnings**.
Fingerprint `e68c8ce108bdbde60be947661bdaf7168e1c4ab4550b0b49a0696709851bd0ed`
(239 files). `timeout 180 npm test` ended with exit 124 after **176 passing subtests**, with no reported failures; not a completed full-suite pass.

Scene **645,300 -> 636,428 triangles**, **906 -> 919 primitives**. This is not
an overall performance or likeness claim. Landmark RMS/max stay **9.8003 /
25.9151 px**. Actual back/side inspection drove the added collar closure after
an incomplete first trial. The neck tube and floating shoulder interfaces
improve locally; the whole scene remains far from the reference.

[API](bridge-surfaces.md) · [research](research/shoulder-girdle-boundaries.md) ·
[exact checks, ownership and limitations](checkpoints/2026-09-19-prism-girdle.md).
Evidence: `renders/girdle-review/`, CI artifact `shoulder-girdle-review`.
Base full combined form and primary/signal/foot CI verified successful.
New-commit CI/Pages pending at checkpoint; no new native Blender claim.

Next: shoulder module attitude and upper-arm/rib silhouette, not detail density.

## 2026-09-19 — primary body planes at unchanged resolution

Base **530e302f5b043ac3dc3d6337d88dff94b539f6bb** and its exact source tree
verified via connected GitHub and locked kit. The containing commit is the
implementation revision. Existing defaults, annotations, camera and poses stay
unchanged.

Added bounded `squareness`/`depthBias` profiles to existing `sectionLoft`, used by
`massStyle: structured` for rib/waist/pelvis planes and an unrelated inspection
housing. Fitted chest contours and shoulder wraps follow the changed supports.
No new mesh density, texture, shader or normal bake. **645,300 scene triangles /
906 primitives**, same as before; landmark RMS/max remain **9.8003/25.9151 px**.

Local doctor, **26/26 expanded tests**, targeted model **1/1**, **44-recipe build**
passed. Final review: **6 cases / 36 renders / 3 GLBs with zero errors/warnings**;
source fingerprint `dd9a890ee91eec85d1fbcaaa6f6ee2196ab8de286e16fa114081e8934a77fe5a`
(235 files). Full npm test bounded at 180s after **165 passing subtests**; no full
local suite pass claimed. Head/hand/foot buffers and pose transforms are checked
unchanged. Best visual evidence is three-angle clay, not triangle counts.

Rejected far-shoulder root moves looked smaller in hero view but disconnected in
side view. Removed those experiments rather than hiding the problem. Corrected
an inward-wound fixture cap and reran the final review. Whole-image likeness
remains poor; torso planes improve modestly, shoulder connections and broad
armor still need work.

[API](section-shape.md) · [source notes](research/rib-planes-and-sections.md) ·
[full checks/rejections](checkpoints/2026-09-19-prism-primary.md).
Evidence: `renders/primary-review/`; CI artifact `primary-form-review`.
Base **Pages build/Blender/deploy now verified successful**, while its long
combined form review was cancelled at the final hand stage. New-commit CI is
pending at checkpoint; no native Blender claim for this variant.

Next: connected shoulder-girdle/neck construction, judged from reference and
alternative views, not further isolated root repositioning or detail density.

## 2026-09-19 — optical detail maps replace unnecessary ring geometry

Base main **425a1fda81ff0f0f3ed437c682b99e30056da544** and exact locked source kit
verified through GitHub; base foot and combined form CI completed successfully.
The containing commit is this pass's implementation revision.

Added reusable `radialProfileMaps`: independent color/emission stops, linear-space
interpolation/filtering, owned sRGB textures. Optional `emitterStyle: mapped`
retains port housings/bezels/rims but uses shallow lenses for the optical bands.
An unrelated non-emissive ceramic tile exercises the same operation and existing
semantic face-material assignment. Head/body pose, camera, feet, annotations and
all old defaults are preserved. No new normal bake or custom shader is claimed.

Local: doctor, **7/7** new / **36/36** expanded tests, **44-recipe build**;
**7 cases / 39 renders / 4 GLBs, zero errors or warnings**. Complete source
fingerprint `b5f0414242981ac544ffa3d407a4d13d15d0d7ec2ef53f17ae57e67c9de21746`
(233 files). Full npm test was bounded at 180 seconds after **165 passing
subtests** (exit 124); the separate broad model-test invocation also timed out.
No full-suite/whole-gallery success is claimed from those local attempts.

Scene **722,916 -> 645,300 triangles**, **1,058 -> 906 primitives**;
isolated port **4,224 -> 1,872 triangles**. Hero silhouette is unchanged (IoU 1),
but isolated side silhouette changes (IoU .96407); maps do not restore parallax.
Landmarks unchanged **9.8003 / 25.9151 px RMS/max**. New image storage and texture
sampling cost are explicit; no frame-rate claim. Broad colored lenses/warm cores
look closer locally; the full figure remains far from the reference.

[API](radial-profile-maps.md) · [research](research/radial-optical-detail.md) ·
[full checks, limits and rejected tile-UV trial](checkpoints/2026-09-19-prism-signals.md).
Evidence under `renders/signal-review/`; new CI artifact `radial-signal-review`.
Final-commit CI/Pages pending at this checkpoint. Next: the larger shoulder/rib/
pelvis silhouette rather than continued decorative detail.

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

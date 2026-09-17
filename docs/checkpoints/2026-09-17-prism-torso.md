# Shared-support torso and concave shell contours

Base main: `64d3589806e2fcf6a0d43166ddad87e03ac936b5`. Recovered exact source and
locked dependencies through authoring-kit run 35250363655 / artifact 10509327602.
Local baseline Git tree matches remote tree `629469d3404c3d1966af9ed2e18e563fbd4c8bd6`.
The containing commit identifies this tested implementation. Main's previous
Pages build, native validation jobs, and deployment were actually inspected and
all succeeded; the older Pages-failure claim is no longer current for this base.

## Scope

User requested continuing the reference reconstruction after accepting the new
illustrated head direction. New `bodyStyle: articulated` is opt-in alongside
`headStyle: illustrated`; legacy defaults are preserved. No camera, guide,
reference annotations, limb lengths, head, hair, cable routes or reactor are
changed. The reuploaded reference is visually available; its encoded checksum
still differs from the historical original-file hash. No reference raster is
committed, and no generated picture stands in for a geometry render.

The old torso combined disconnected spherical masses, flat belt strips and a
pointed flat apron. The replacement shares one curved support through the
ribcage, narrowed waist and pelvic arch. Scalloped chest leaves, swept iliac
rims, split apron and notched shoulder cowls are real thickened shells. Ports,
ribs and enamel slots follow the same support. Hip *cores* are reduced to 86%
of their previous size, without moving joint origins or changing limb lengths.

## Workflow capability

`surfaceContourGeometry` constructs a fresh UV-parametric mesh from a simple
concave outline, optional quadratic corner rounding, and shared-edge refinement
before evaluating the support. It reuses locked Three.js ShapeUtils and composes
with the existing solidify/semantic-region/attachment operations rather than
inventing another shell or deformation stack. Explicit contracts and source
notes are in `docs/surface-contours.md` and
`docs/research/contoured-surface-panels.md`.

The second example is a notched curved mechanical hatch, independent of the
android's units, camera, skeleton, annotations and file paths. No source mesh is
accepted by this constructor: existing anchors, weights and high/low
correspondence must be rebound, not silently presumed valid after a new contour.

## Checks and evidence

- `npm run doctor`: Node22 / Three186 / Chromium144 / WebGL2 SwiftShader.
- Focused command: `node --test tests/surface-contour.test.js tests/prism-torso.test.js tests/surface-thickness.test.js tests/form-design.test.js tests/illustration.test.js` — **35/35 pass**.
- `npm run build`: **44 recipes**. No added dependencies.
- `node scripts/review-torso.mjs`: **5 cases / 33 renders**, including fixed-camera hero material/clay/silhouette, torso material/clay/wire at three angles, and three-angle hatch material/clay/wire.
- Three GLBs all **0 errors / 0 warnings**. Infos retained: full scene 1206, isolated torso 90, hatch 1.
- Hero before/after: **548,936 / 618,996 triangles**, **581,051 / 626,710 vertices**, **1215 / 1208 meshes**. This is a topology-changing component reconstruction, not unchanged geometry or a normal bake.
- Torso before/after: **76,020 / 118,368 triangles**, **60,225 / 84,732 vertices**. Hatch: **6,944 triangles / 5,074 vertices**.
- Alignment is unchanged: **7.861070027 px RMS / 17.959270727 px max**. These manual diagnostics are not likeness acceptance. Tests additionally compare head, torso mount, limb and reactor world transforms and pose metadata.
- Reviewed source fingerprint: `aa7b8dcc7a4ac7f4a5e316f55752015120a13fb49e763a713efc7f619761eddc` (204 files). Documentation/test-only follow-ups do not change it.

Evidence root: `renders/torso-review/`, incremental `review.json`, all validation
reports, `hero-comparison.png`, `torso-comparison.png`, isolated hatch views.
Earlier experiments remain under `renders/torso-trial1*`, `torso-trial2`,
`torso-trial3`; trial2 source support snapshot is retained outside Git.

## Visual decisions and limits

Accepted: continuous rib/waist relationship; curved rather than planar pelvic
armor; large shell cutouts; reduced hip cores; a modest forward/sway correction
of the *support*, not the skeleton. Rejected: trial3's stronger forward chest
projection obscured the far shoulder; retained about half of that shape shift.
Material and clay/alternative views were inspected. The shoulder core and
mounted emitter remain separate and exposed in the retained view.

Still draft: black trunk is too smooth/unsegmented, the hollow chassis has open
neck/pelvis ends, pelvic-apron contours remain simplified, and the thigh/shin
and boots remain too regular and cuff-like. The figure is not a reference match.
The helper only supports one simple loop, not holes, booleans, metric fillets,
collision repair or exact even-thickness guarantees. Strongly folded supports
can overlap; uniform subdivision does not optimize triangle quality.

Next: use the new contour capability to correct major thigh/knee and boot shell
boundaries, without adding decorative density or changing accepted limb lengths.
Inspect final-SHA CI independently; previous-SHA deployment is not evidence of
this new variant's deployment or native Blender appearance.

Full local `npm test` was bounded at 180 seconds and exited 124 after **160 passing subtests / zero reported failures**. This is not a completed repository-wide pass. The targeted recipe check initially exceeded a short foreground command bound, then completed separately: `node --test --test-name-pattern="^cyber-form-study:" tests/models.test.js` passed **1/1**, including all parameter limits, in 66.7 seconds. No failed test was suppressed.

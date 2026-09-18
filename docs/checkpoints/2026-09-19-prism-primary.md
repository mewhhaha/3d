# Primary rib, waist, pelvis and shoulder pass

Base main: **530e302f5b043ac3dc3d6337d88dff94b539f6bb**. Connected GitHub
read and exact locked authoring kit verified; local baseline tree is
`4d58f43c3583611b33277a3661c4817b5e3095ea`. The containing commit is the
implementation revision. No stale local snapshot was promoted.

## Implemented

Extended existing `sectionLoft()` with optional smooth `squareness(v)` and
`depthBias(v)` functions. Old calls evaluate the same ellipse exactly. Bounds
are validated at sampled sections; no new dependency or universal human builder.
See [API](../section-shape.md) and [primary source notes](../research/rib-planes-and-sections.md).

Optional `massStyle: structured` changes the supporting rib/waist/pelvic profiles,
with broader lower ribs, a narrower upper chest, a raised iliac crest, and
separate posterior-pelvis/anterior-rib depth. The existing fitted armor and
surface-mounted ports follow the same surface. Sloping clavicular contours,
smaller cowls and narrower deltoid wraps replace the too-horizontal collar and
bulky shoulder shells. Previous defaults remain unchanged. This is an artistic
hypothesis, not recovered anatomy or reference image projection.

An unrelated mechanical inspection housing exercises the same section shaping
at identical resolution, with its port attached to the changed surface. The
housing's flat end caps are outward-facing; this was checked visually and added
to regression tests after a rejected inward-winding trial.

## Actual local checks

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2, SwiftShader,
  virtual display; passed.
- `node --test --test-concurrency=1 tests/section-shape.test.js tests/mass-forms.test.js tests/structure-forms.test.js tests/prism-torso.test.js tests/prism-gesture.test.js tests/prism-hands.test.js tests/prism-foot.test.js`:
  **26/26 passed**, including five new section/scene/fixture tests.
- `timeout 100 node --test --test-name-pattern="cyber-form-study" tests/models.test.js`:
  **1/1 passed**, including default/determinism/parameter-limit checks.
- `npm run build`: **44 recipes**, passed.
- `timeout 180 npm test`: exit **124** after **165 passing subtests**, no failure
  reported before the bound. Not a completed full-suite pass.
- `node scripts/review-primary.mjs renders/primary-review`: **6 cases / 36
  renders / 3 exported GLBs**, all **zero validation errors and warnings**.
  Images include full scene material/clay/silhouette, three body views in
  material/clay/wire, and two fixture views in material/clay/wire.
- Every final review case shares source fingerprint
  `dd9a890ee91eec85d1fbcaaa6f6ee2196ab8de286e16fa114081e8934a77fe5a`
  over **235 files**. Final cap fix and tests are included.

## Comparison and ownership

Scene before/after: **645,300 triangles / 627,298 vertices / 906 primitives /
49 materials**, unchanged. Body before/after: **382,656 triangles / 300,196
vertices**, unchanged. Mechanical housing before/after: **5,832 triangles**,
unchanged. These counts show fixed resolution, not likeness quality.

Tests preserve the named pose/world transforms, joint origins, limb lengths,
head, wrists/hands and planted feet. Head/hand/foot position, normal, UV, tangent
and index buffers are identical across the accepted variants. The torso's
understructure index/UV buffers stay identical while its positions change.
New contour layouts can retriangulate, so whole-scene correspondence is not
claimed. No new texture, shader, skin, animation or normal bake was added.

Reference landmarks remain **9.8003344814 px RMS / 25.9151421421 px maximum**.
Hero silhouette overlap with the *previous render* is **0.993336**; mean absolute
RGB change over the foreground is **0.023872**. Neither is a resemblance score.
Existing manual reference annotations and their uncertainty are unchanged.
The reuploaded reference was available and inspected; its encoded SHA is
`8c4d3c151bfc2b1edc784391660e5c2f693b436a4ebbff5218c7198d3ac2c88f`, not the
historical original-file checksum. No reference raster enters Git history.

## Visual assessment and rejected trials

The accepted change is clearest in clay: the rib cage has clearer planes and
lower fullness, the waist transitions more deliberately into the raised crest,
and the shoulder shells are less bulky. Full-scene improvement is modest. The
shoulder-to-chest connection, simplified smooth abdomen, head/face/hair and
reactor/cable organization remain substantially unlike the reference. This is
not a finished anatomical shell or a validated collision-free mechanism.

Rejected: moving the far shoulder toward the torso, and rotating its root to
hide it from the reference camera. Whole-arm two-link solving preserved segment
lengths, but side views exposed a floating/disconnected shoulder. Those pose
changes were removed entirely; the accepted camera, limb poses and body
counterpose are unchanged. One screen-constrained trial was unreachable at the
fixed bone length and correctly threw. Trial sources, patch and renders remain
in the evidence bundle, not in working defaults.

A first review completed rendering but used the wrong comparison argument names;
it failed rather than silently fabricating metrics. Corrected to the existing
`reference`/`referenceMask` API and reran. The fixture cap winding error was also
fixed and the complete final review rerun. Earlier outputs are preserved.

## CI scope and next work

Base revision's signal and foot CI passed. Its long combined form job was
cancelled at the final hand review after preceding stages passed. Separately,
**base Pages build, Blender jobs and deployment succeeded**, as verified this
run; the previously reported gallery failure is no longer current. This does
not certify the new variant's Blender appearance.

New independent `primary-study` job runs the focused tests and review and uploads
`primary-form-review`. Final-commit CI/Pages are pending at this source checkpoint.
Local evidence: `renders/primary-review/review.json`, `hero-comparison.png`,
`body-comparison.png`, case images and GLBs. Bulky outputs stay out of source.

Next: fix the shoulder girdle/neck connection as a connected assembly before
attempting another root movement; review the actual reference torso contour
alongside side views. Keep broad form work separate from painted surface detail.

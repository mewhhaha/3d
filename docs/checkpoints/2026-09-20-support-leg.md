# Plain mannequin support-leg pass

Base main **682d7e1265a1315ffe47dbe40c94fae01c357407**, exact tree
**e5f18299306f8e9bd8e580731b9e8dccb23f435c**. Verified using connected GitHub,
the 75f7dabc locked kit and the two-file documentation-only successor diff.
The reconstructed tree matched main exactly. The latest work already contains
the original 28-bone foundation; this pass extends it rather than duplicating it
or applying the obsolete flow patch. Base local-studio and Pages runs both passed.
The containing commit is this implementation revision.

## Implemented and inspected

Added `slideRootForBend()` to the existing two-link module, with an authored
slide line, fixed endpoint/lengths, nearest intersection, and bounded travel.
Optional `pose.support` uses it to adjust hip height before all limbs are solved.
A failure in the opposite leg or either arm restores the previous entire rig.
This is kinematics, not physical balance or an anatomical knee constraint.

The existing shot study retains `baseline` and `shot`, adding `stance` with a
changed pelvis/waist counter-roll and an explicitly selected supporting leg.
Its near/Left knee flexion changes **34.0193 -> 14 degrees**; the opposite knee
is **25.5802 degrees**. The required model-Y hip slide is **0.0153308 m**. Wrist
and ankle targets, bind proportions, link lengths, mesh buffers, weights, UVs,
materials, reference annotations and camera are unchanged. The torso/head move
with their parent chain; their world positions are NOT claimed unchanged.

The helper is also exercised on slender/broad humanoids at 1.4/1.72/2.1 m and a
mechanical inspection boom with a sliding root and a fixed sensor. The generic
mannequin's old presets/defaults and the detailed android are unchanged. The
new study is **11,968 triangles / 34 skins / 28 bones / 2 materials / no textures**.
No extra triangles, shaders, costume, normal bake or imported Mixamo asset.

The plain pose is easier to read with one straighter leg. It still has an
oversized egg-like rib mass, rough shoulder/waist junctions, mitten hands and
placeholder feet. It is not an accurate reference body or a completed skin.
Side, front and three-quarter views were opened and inspected. Keep the
body/proportion stage ahead of costume work; the reference is not a reason to
hide unresolved forms beneath detail.

## Research

[Source notes](../research/mixamo-foundation-and-support.md): Adobe's public
Mixamo upload/rigging instructions and FAQ, plus Blender's written IK constraint
manual. These informed the neutral body-first workflow and separation of targets,
bend plane and stretching. Our segmented skinned proxy is not promised to be a
valid Mixamo auto-rig input. No video, proprietary asset, FBX upload or animation
retargeting has been reviewed/tested in this pass.

## Actual local checks

- `npm run doctor`: Three.js r186 / Chromium 144.0.7559.96 / WebGL2 / SwiftShader
  with virtual display; passed.
- `node --test tests/humanoid-support.test.js tests/humanoid-shot.test.js tests/humanoid-mannequin.test.js tests/two-link-pose.test.js tests/export-skin-roots.test.js tests/rigging.test.js`: **24/24 passed**.
- Exact local-studio unit command including the new tests: **40/40 passed**.
- `timeout 100 node --test --test-name-pattern='humanoid-mannequin' tests/models.test.js`:
  **1/1 passed** (default, deterministic bounds and parameter limits).
- `npm run build`: **45 recipes**, passed.
- `node scripts/review-support-leg.mjs`: **11 cases / 32 renders / 4 GLBs**, each
  with **zero validation errors and warnings**. Bind/posed-preview shot GLBs are
  byte-identical. Includes both builds in T bind and supported pose, three-view
  clay/wire comparisons, and the mechanical example.
- `node scripts/review-mannequin-shot.mjs renders/shot-roundtrip`: **6 cases /
  24 images / 2 valid GLBs**. Reimported all three clips, including `stance`:
  136 sampled vertices per pose, maximum error **5.25e-8 m**. This is actual skin
  export verification, not a normal-bake error.
- `node scripts/review-humanoid.mjs renders/foundation-final`: **7 cases / 65
  images / 3 valid GLBs**, with previous generic-pose export/skin checks retained.
- All final reviews share computational fingerprint
  `acbc6346104622d81ec884f8a3c12e23b2a7f8f11c796ffe58bb0800762a1abe`
  over 258 files.
- `timeout 180 npm test`: exit **124** after **193 passing subtests**, without a
  reported failure before the bound. Not a completed full-suite pass.

The first review was stopped by its outer execution bound during the last
browser startup and reported a closed-browser error. Its partial report/images
remain in `renders/support-leg-attempt1/`. The entire final review was rerun and
completed with exit 0; no failure was converted to success.

A straighter Left knee with the earlier pelvis roll made the opposite planted
leg unreachable. That request is preserved in `renders/rejected-support.json`.
It was not rescued by stretching the legs or sliding the feet; the new pelvis
counter-roll was an explicit separate pose correction.

## Save and next step

[API](../support-leg.md). Evidence is under `renders/support-leg-review/`,
`renders/shot-roundtrip/`, `renders/foundation-final/` and the external evidence
bundle. No reference raster or generated model is added to Git. The reupload
was visually available; its encoding hash differs from the historical original.
The local-studio workflow runs the added review; final-commit CI is pending at
source checkpoint. No native Blender result or new Pages deployment is claimed.

Next: refine the plain ribcage/pelvis/waist proportions and far-arm depth under
locked cameras, using these named bones and simple skins. Do not resume ceramic,
neon or shader polishing before the unclothed construction is convincing.

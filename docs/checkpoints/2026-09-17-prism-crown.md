# Prism: rear crown rails and concealed temporal volume — 2026-09-17

## Scope and provenance

User requested a hands-on return to the cyber-android reference after the workflow-first passes. Base main: `92269c9085cb63e537d6f8c704bb3df9fd84617e`. The offline authoring kit is from its direct parent `e4c5b590e6d2662a024387de5074d73544c6ec9c`; the intervening main commit changes only the authored-shot documentation/checkpoint, not source. Preserve those newer files. Tested production-source fingerprint: `a69b177643e84ea9004fd50713ee8e85ad396ce4e61575ce61dd03a741f7a53e` (194 files). This checkpoint ships with the implementation; its containing Git commit identifies the published revision.

The original 768 x 1376 raster was **not recovered or hash-verified in this run**. Visual comparison used its resized left panel in the previously saved `run6-reference-before-after.png`, not a later generated illustration. The required original SHA-256 remains `127f0f4216b12e279f01c77206720feb4e76ab989b7ed92576505faa4f329218`. No raster enters source history. `references/prism.json` and `references/prism-hair-outline.json`, their uncertainty, camera, pose, named feature origins and limb lengths remain unchanged.

## Accepted construction changes

- `bobGuides()` now applies an endpoint-pinned scalar `shapeProfile()` to the named rear guide rails **before** `railSurface()` and the existing partition/boundary matching. This gives the bob a fuller rear volume without a narrow post-loft deformation ridge. The original guide data, crown roots, blunt cuts, forward curtain boundaries, chart resolution and 512-pixel normal maps remain intact.
- `crownRoundness: 0..1` is an editable component parameter, also exposed in `cyber-form-study` and the small head study. Zero restores the previous hair support; one is the revised default. This is a component construction control using the existing reusable API, not another general deformation library.
- An additional `weightedTransform()` field recesses concealed temporal skull volume behind the cheek plane. The rendered off-white oval previously piercing the side curtain disappears. Regression samples on the forward eye/nose/mouth chart remain equal to their pre-edit values.
- Pose, armor, backpack, routes, lighting, camera, materials and detail amplitude are otherwise unchanged. The whole scene is not a skinned or normal-baked character; only the existing hair detail has high/low/baked representations.

## Research and experimental decisions

Accessed 2026-09-17: Three.js **CatmullRomCurve3** documentation, https://threejs.org/docs/pages/CatmullRomCurve3.html . It documents authored control points and spline evaluation independently of sampled geometry. The repository's `guideCurve()` uses the locked r186 centripetal curve; `railSurface()` performs its own cubic cross-rail interpolation. Adaptation: edit the meaningful construction rails before interpolation, instead of adding a localized Cartesian warp after the charts exist. The actual shape decision is this experiment's result, not a technique attributed to the documentation.

Blender Mesh Filter / Cycles baking documentation and Julien Kaspar's Design Sculpting page were also attempted; access was inconsistent/blocked on recheck. No inaccessible lesson or video is claimed reviewed. The two earlier construction videos remain unreviewed.

Rejected and preserved outside source history: a raised front-crown field (fringe baked maximum 16.662 degrees); denser fringe trial (14.236 degrees); larger-texture trial (13.941 degrees); rear Cartesian band (visible ridge; curtain maximum 5.670 degrees); post-loft width field (still a visible ridge; curtain maximum 2.993 degrees). Final low/high resolution and texture size are the original settings. Do not reintroduce the rejected trial defaults.

## Local checks and actual evidence

Environment: Node 22.16.0, Three.js r186, Chromium 144.0.7559.96, WebGL2 / SwiftShader. `npm run doctor` passed. `npm run build` passed with **44 recipes**.

Focused command, after moving the two new tests into their own file:

```sh
node --test tests/prism-crown.test.js tests/form-design.test.js tests/shape-rails.test.js tests/region-mask.test.js tests/compact-geometry.test.js tests/surface-boundary.test.js tests/surface-cache.test.js tests/contour-volume.test.js
node scripts/measure-hair.mjs renders/review-bake-rails
node scripts/measure-reference.mjs models/cyber-form-study.js renders/review-alignment.json
```

The final focused set passed **36/36** after the test-only split; the dedicated `tests/prism-crown.test.js` rerun also passed **2/2**. No completed full local repository test suite or full-gallery bake is claimed. Existing tests and thresholds were not weakened.

A fresh two-value `measureRecipe()` comparison of `crownRoundness:0` and `1` gives identical nine-landmark RMS **9.356657547 px** / maximum **17.959270727 px**. The coarse hair-envelope diagnostic **decreases from 0.930362872 to 0.910740673**. It still passes the unchanged historical threshold, but this is a real tradeoff, not an improved score. The saved reference panel and multi-view renders motivated retaining the fuller rear volume. Neither envelope overlap nor landmark alignment establishes likeness.

Hair normal measurement uses actual high geometry and 4096 samples per chart. Cage and baked position/normal/UV/tangent arrays and indices are asserted identical **within each variant**; the primary low support does change from before to after. Both variants contain **138,816 high / 15,936 cage / 15,936 baked triangles**, including the component closure.

| Baked error, degrees | Before mean / p95 / max | Accepted mean / p95 / max |
| --- | --- | --- |
| Curtain | 0.197486 / 0.361743 / 2.258470 | 0.191351 / 0.354449 / 2.821858 |
| Fringe | 0.271093 / 0.612677 / 8.767565 | 0.270300 / 0.606693 / 8.767565 |

The curtain tail worsens slightly but stays below 5 degrees; the fringe still exceeds that editorial target. Normal textures do not recover high-geometry silhouette detail. Reports retain `attributesIdentical:true` and their explicit remaining-tail target.

Final in-memory render session reuses the saved **baseline cameraState** for every comparison, rather than refitting the edited bounds. It produced 17 final images: four full-hero cage passes at 768 x 1376; front/side/three-quarter head views in material, clay, wire and silhouette at 600 x 700; and a full baked-hair material hero. Material, neutral clay, side, wire and silhouette images were actually inspected. The rear crown is fuller and the temporal poke-through is removed; the apex/parting is still too angular, the face is still a simplified collection of surfaces, and the armor/reactor remain too regular.

Local evidence root: `renders/review-final/` (head, hero-cage, hero-baked). Before images: `renders/review-head-before/`, `renders/review-hero-before/`. Normal reports: `renders/review-bake-{before,rails}/normal-transfer.json`; rejected reports retained under trial directories. Final session driver: `renders/final-render.mjs`, retained with the artifact bundle rather than made into more production infrastructure.

- Head GLB: **37,872 triangles**, 24 meshes, 20,144 vertices; validator **0 errors / 0 warnings**, 22 infos.
- Full scene GLB: **536,904 triangles**, 1,213 meshes/primitives, 574,817 vertices; validator **0 errors / 0 warnings**, 1,209 infos. Five embedded textures in baked mode, versus three in cage mode. Ordinary named objects and the existing rigid `Survey` clip survive local export/reload.
- Validator infos are retained, not suppressed. These component/scene GLB results do not certify native Blender compatibility or the full gallery.

## CI and next target

At start, main's Pages workflow `35231027052` passed its 333 repository tests, build, Chromium reference projection and native reference-scene check, then failed during full-gallery render/export/roundtrip. Diagnostic artifact `10501279838` was downloaded and inspected. This pass does **not** claim to fix that pre-existing gallery failure; its exact failing assertion was not isolated within the bounded review. Check the new implementation commit's actual Actions results separately.

Next visible target: integrate the head's crown/parting transition and eye-socket/cheek surfaces at primary-form level, with the current normal-bake tail as an explicit bound. Recover the original hash-verifiable raster before claiming full-resolution reference comparison. Continue to keep broader workflow tooling reusable; this user-requested scene review does not reset the workflow-first project priority.

# Articulated boot checkpoint: 7baedd72

Model/tool revision: `7baedd72fd93db23d32a7333e97e8ea0821ee574`.
Base revision for this pass: `1ea30ad197bd0959b37ef56768a60be85a5775f3`.
Active model: `cyber-form-study` — Prism / guided form refinement.
Dedicated form-study workflow: `35065822061`, successful.
Artifact: `guided-form-review`, ID `10434167867`.

## Accepted changes

- Added reusable `archedFootSurface()` to `src/lib/cyber/contour-armor.js`. Foot width, arch height and centerline are now authored as smooth physical profiles independently of render tessellation and shell segmentation.
- Rebuilt `sculptedBoot()` on that support. The sole is shorter and thinner, the previous semicircular sneaker-like toe bumper is removed, and the ceramic exterior is now a shared-support set of outer/inner toe blades, heel quarters and a lifted lateral midfoot rail with intentional dark chassis gaps.
- Replaced the tall cylindrical ankle cuff with a compact segmented ankle yoke containing inner/outer shells and rear clamps. The heel bearing is smaller and cyan to match the visible reference emitter family more closely.
- Reused the existing `segmentedArmor()` and lift-profile vocabulary rather than introducing boot-specific low-level coordinate tables. The same composition abstraction now covers thigh, shin and foot shells.

## Evidence

The supplied reference was inspected through the previously saved private reference checkpoint; the original raster remains absent from public source history and no annotation was changed. The accepted boot comparison shows the reference feet, the previous component render and the new articulated component.

Local component validation before pushing:

- `npm run doctor` reported WebGL2, Chromium and SwiftShader available.
- `archedFootSurface()` was sampled over a 9 x 9 grid; positions and unit normals were finite and invalid reversed heel/toe bounds were rejected.
- The isolated accepted boot rendered with **23,248 triangles** and its GLB validated with **0 errors / 0 warnings**.
- A recovered-kit hero context render was used only to judge full-figure scale; it was not treated as validation of the latest complete source tree.

Independent CI at revision `7baedd72` completed successfully. The dedicated workflow passed its targeted construction tests, local-equivalent render/export review, visible-mask comparison, support/cache checks and normal-transfer checks. `verification.json` reports status `passed` and visual acceptance `not-assessed`.

The CI fixed-camera baked hero has **536,904 triangles**. The baked scene GLB and standalone baked hair GLB validate with **0 errors / 0 warnings**. The separate boot-component CI render has **23,248 triangles**.

Reference landmark alignment remains unchanged: **9.3566575468 px RMS**, **17.9592707268 px maximum**. The unchanged coarse hair envelope is **0.93036 IoU** after the guided-form work; this is an authoring diagnostic, not a likeness score.

Hair normal transfer remains effectively unchanged by this boot-only pass: curtain baked mean / p95 / max **0.197 / 0.362 / 2.258 degrees**; fringe **0.271 / 0.613 / 8.768 degrees**. The fringe tail remains above the existing five-degree editorial target.

The broader Pages workflow had passed repository tests, the site build, Chromium reference review and entered its Blender/native verification phase when this checkpoint was recorded. Deployment was therefore not yet claimed.

## Visual assessment

The new boot reads less like a tall sneaker: its outsole is thinner, the toe is shorter, the ceramic upper has larger dark articulation channels, and the ankle assembly is lower and more mechanical. In the full fixed-camera CI hero, the foot proportions sit more naturally under the long shin than the previous tall cuff and thick orange sole.

The boot still remains cleaner and more regular than the artwork. Its orange outsole is a continuous smooth perimeter rather than the reference's more irregular mechanical sole, and the side/rear ankle connection still lacks some interlocking bracket depth. These are lower priority than the remaining broad planar crown/head cross-section, which continues to dominate the upper silhouette error.

## Next target

Keep pose, camera, annotations and the accepted hair bake fixed. Return to the primary crown/head cross-section with a construction that changes the actual upper support rather than merely adding a cap, while retaining the current fringe normal-transfer tail as a regression bound. If that cannot be improved without a bake regression, strengthen the boot's side/rear mechanical silhouette with one or two larger connected forms rather than decorative greebles.

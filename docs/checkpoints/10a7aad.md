# Workflow checkpoint — shrink-resistant BufferGeometry relaxation

Base remote revision: `c2c157887c8379c0b3b0002b6643b3cef3278768`.
Implementation revision: `10a7aad843fda7ca74a143db725df4dbeb853251`.
Capability: fair noisy ordinary indexed `BufferGeometry` with an explicit shrink-resistant operation that composes with the existing selection vocabulary while preserving topology and old `smoothVertices()` behavior.

## Accepted change

`src/lib/geometry-sculpt.js` adds `relaxVertices(selection, { lambda, mu, iterations, preserveBoundary })`. Each iteration performs the same simultaneous uniform one-ring displacement already used by the bounded sculpt layer, first with positive `lambda` and then with negative `mu`; v1 validates `0 < lambda < -mu`. The operation uses the same point masks, named face-region conversions, boundary pinning, clone ownership, normal/bounds rebuild and tangent handling as the existing topology-preserving sculpt pipeline.

This is a separate operation instead of a semantic change to `smoothVertices()`: old recipes retain one-way averaging, while authors can opt into shrink-resistant cleanup when preserving primary bulk matters. `models/geometry-relax-study.js` exposes baseline / smooth / relax as controlled alternatives.

## Research used

See `docs/research/mesh-relaxation.md`.

- Gabriel Taubin, *Curve and Surface Smoothing without Shrinkage* (ICCV 1995): ordinary positive smoothing shrinks; the paper describes alternating positive and negative smoothing factors with `0 < lambda < -mu`. Adaptation: reuse the repository's existing uniform one-ring operator with validated bounded defaults instead of introducing another dependency or claiming the full signal-processing formulation.
- Blender Manual, Laplacian Smooth Modifier: shrinkage is an explicit concern and preservation/influence are separate controls. Adaptation: keep shrink behavior as an explicit operation choice and continue to compose it with independent masks rather than replacing the old smoother.
- Three.js `BufferGeometry`: indexed topology and dependent normal/bounds ownership support keeping this inside the existing clone-and-edit pre-rig stage.

## Examples and local evidence

- Organic fixture: a closed noisy stylized creature shell uses whole-form relaxation. An original-scale gauge makes bulk loss visible independently of material shading.
- Mechanical fixture: an unrelated open domed service cover intersects `panel.service` with a radial falloff, then relaxes only that authored area while preserving the open boundary.
- `npm run doctor` — Three.js r186, Chromium 144.0.7559.96, WebGL2, SwiftShader.
- Expanded focused geometry suite — **61/61 passed**.
- Targeted `geometry-relax-study` recipe metadata/default-build/determinism/parameter-limit check — **1/1 passed**.
- `npm run build` — passed with **35 recipes**.
- `npm run study -- studies/geometry-relax.json renders/run27-geometry-relax-final` — passed **5 cases / 60 locked-camera material, clay, wire and silhouette renders**, source fingerprint `1b778cb86f45d2a2ad4fb5868c5ea7764b2ff9211aca43d5e141c96f4f70b658` over 168 source files.
- Baseline/smooth/relax combined cases are each **8,744 triangles / 8,040 vertices**; organic-only is **4,280 / 2,466**, mechanical-only **4,464 / 5,574**. All five study GLBs validate with **0 errors / 0 warnings**.
- Synthetic noisy-sphere fixture: baseline mean radius `1.0017415`, radial std `0.066516`; six one-way smooth passes produce `0.9770515` / `0.044485`; ten relaxation iterations (20 passes) produce `1.0032991` / `0.044504`. Mean-radius change is therefore **-2.465%** for the smooth comparison versus **+0.155%** for relaxation at essentially equal radial-noise reduction. This is a form-retention comparison, not a runtime/per-pass efficiency claim.
- Baseline→smooth silhouette IoU: front `0.955408`, three-quarter `0.938379`, side `0.887458`. Baseline→relax: front `0.970393`, three-quarter `0.958151`, side `0.923911`, so the shrink-resistant result stays closer to the authored outer form in every locked view.
- A bounded repository-wide `npm test` attempt reached test **121 with no failures** before the 420-second execution bound. No complete full-suite local pass is claimed.

## Visual assessment

The accepted contact sheet plus side material/wire views were inspected. Baseline surfaces deliberately show strong high-frequency noise. Plain smoothing and relaxation both fair that noise; the one-way result pulls the organic shell inward more visibly against the scale gauge, while the alternating result retains a fuller envelope. The mechanical comparison likewise keeps more of the shallow crown while its frame/open boundary remains fixed. `visualAcceptance` remains `not-assessed` because this is a workflow/regression fixture, not a finished creature or prop.

A first comparison with fewer relaxation iterations retained form but did not clean the organic noise as strongly as the smooth fixture. The accepted comparison uses ten relaxation iterations so radial-noise standard deviation is essentially equal. This intentionally spends more passes and avoids presenting retained volume as a free performance win.

## Remaining limitations / next workflow priority

`relaxVertices()` uses uniform one-ring weights, not cotangent/Laplace-Beltrami weights or an exact continuous fairing/volume constraint. Results remain tessellation- and valence-dependent; aggressive negative passes may overshoot or self-intersect. Each relaxation iteration costs two passes and function-based selections are re-evaluated on the evolving geometry, consistent with the rest of `sculptGeometry()`. Rig and morph ownership remain rejected.

The next general workflow priority is **reusable broad local deformation frames/handles for bend, taper and twist on ordinary geometry**. The selection/mask, projected-stroke, one-way smoothing and shrink-resistant relaxation vocabulary is now useful enough that the next high-leverage gap is changing primary silhouette over a region without chains of hand-authored vertex pulls. No cyber-android likeness change is claimed in this pass.

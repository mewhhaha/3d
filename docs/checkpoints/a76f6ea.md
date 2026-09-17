# Checkpoint — `a76f6ea` semantic UV atlas inspection and packing

Implementation revision: `a76f6eaf06323689f25c2ee5da6efe0e6afe2014`.
Base revision: `d5a68ae3e41ea82683dfd84a171073973048d827`.
Reusable capability: inspect already-authored semantic UV charts for overlap and distortion, then deterministically place complete islands into a shared target rectangle with explicit margin, optional 90-degree rotation and opt-in texel-density equalization.

## Authoring change

The preceding `projectFaceRegionUVs()` stage could create controlled semantic charts, but authors still had to hand-place multiple atlas rectangles and had no reusable diagnostic for actual cross-chart overlap or chart-internal distortion. `src/lib/uv-atlas.js` now separates those responsibilities: `inspectUvCharts()` measures the existing mapping, and `packUvCharts()` moves/scales/cardinal-rotates complete charts without changing 3D positions, face order, named regions, material groups or persistent anchors.

`projectFaceRegionUVs()` now records compressed face provenance for each chart and includes chart identity in its UV seam ownership key. Distinct semantic islands therefore cannot accidentally share a target UV vertex merely because current UV coordinates coincide. Packing verifies independent chart vertex ownership before editing UVs.

Inspection reports declared and occupied bounds, surface/UV area, average texel density, degenerate UV triangles, maximum/RMS angular distortion, normalized area-stretch, out-of-bounds charts, and exact positive-area cross-chart overlap by triangle clipping. Packing uses a deterministic rectangle shelf algorithm with `target`, `margin`, `rotate`, and `density: 'preserve' | 'equalize'` options. It is intentionally not an unwrap solver.

## Research influence

- Blender Foundation **Pack Islands** documents rearranging existing islands by scaling/translating/rotating them with an explicit margin, and distinguishes fast bounding-box methods from tighter but more expensive shape-aware methods. Adaptation: a bounded deterministic rectangle pack with explicit custom target region and no exact-shape claim.
- Blender Foundation **UV Stretch** overlay separates angle- and area-based distortion. Adaptation: report chart-internal angular error and scale-normalized area stretch separately from atlas placement and texel density.
- Three.js **BufferAttribute / BufferGeometry** documents per-vertex attribute ownership and indexed vertex reuse. Adaptation: keep chart identity in seam splitting and reject packing if separate chart domains still share UV vertices.

Detailed observations, tests and exclusions are in `docs/research/uv-atlas-packing.md`.

## Distinct examples

`uv-atlas-study` exercises two materially different two-chart subjects. The organic fixture maps a curved stylized creature shell with independent face and crown semantic patches. The mechanical fixture maps a subdivided hard-surface housing with service and header regions using a different projection frame. Both start with deliberately overlapping authored chart rectangles; the packed variants remove those overlaps without changing geometry.

The organic fixture moves from one overlap pair to zero; equal-density packing brings its two average texel-density values from about `1.085 / 2.650` to `2.042 / 2.042`. Its maximum angular errors remain about `14.3° / 26.3°` and maximum normalized area stretch about `1.20 / 1.29`, correctly demonstrating that packing does not fix projection distortion. The mechanical fixture also moves from one overlap pair to zero and equalizes average density from about `1.637 / 3.078` to `3.723 / 3.723`.

## Local evidence

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2 and SwiftShader.
- Focused UV/material/face-region/surface-anchor/render-primitive suite: **36/36 passed**.
- Targeted `uv-atlas-study` metadata/default-build/determinism/parameter-limit test: **1/1 passed**.
- `npm run build`: passed with **41 recipes**.
- `npm run study -- studies/uv-atlas.json renders/run35-uv-atlas-split`: passed, **4 cases / 48 locked-camera renders**, source fingerprint `551b0e49e51a77b368253dde2a33078cdee26eddc9a7ab74329cdccf16d0ddb8` over **185 files**.
- Combined unpacked and packed cases are both **4 logical meshes / 96 render primitives / 4,298 vertices / 4,804 triangles / 6 materials** with identical bounds. Organic-only is **3,272 triangles / 1,882 vertices**; mechanical-only is **1,532 / 2,416**.
- Baseline-to-packed silhouette IoU is exactly **1.0** in front, three-quarter and side views. Material RGB differences are expected because the diagnostic texture samples different atlas locations after packing.
- All four study GLBs validate with **0 errors / 0 warnings**.
- A bounded repository-wide `npm test` attempt reached test **126 with no failures** before the 240-second execution limit; this is not a complete full-suite pass.

## Visual inspection

The contact sheet and packed material/wire views were inspected. Both subjects visibly move from overlapping diagnostic texture regions to distinct atlas placements while clay/wire geometry and silhouettes remain unchanged. The organic mapping still shows the measured curved-surface projection distortion; that is retained as evidence rather than hidden by the pack. `visualAcceptance` remains `not-assessed` because these are workflow/regression fixtures rather than finished art.

## Rejected approaches

- Do not treat packing as unwrapping or claim it improves chart-internal angle/area distortion; it only relocates and uniformly scales/rotates already-authored islands.
- Do not use bounding-box overlap alone as a correctness test; the inspector verifies positive-area triangle overlap.
- Do not silently merge chart domains that happen to share current UV coordinates; chart ownership stays explicit.
- Do not add a heavy polygon-nesting dependency for this bounded first pass; the deterministic shelf pack is small, testable and adequate for compact authored chart sets.

## Remaining limitations / next priority

The packer is rectangle-based, not convex-hull/exact-shape nesting, and can waste atlas area. It has no UDIM packing, arbitrary island pinning, pixel-rounded/mip-safe gutter policy, mirrored-island sharing, LSCM/ABF relaxation or automatic seam inference. Distortion metrics diagnose planar mapping but do not repair it. Morph/interleaved ownership remains explicitly unsupported by the topology-changing projection stage.

The next general workflow priority is **portable surface-detail authoring over semantic charts**: a small procedural decal/mask/trim layer that can target chart rectangles and survive the existing material/GLB loop, exercised on both an organic marking and a hard-surface label/panel treatment. This should keep texture generation, chart placement, material assignment and geometry ownership separable rather than embedding recipe-specific UV arithmetic.

No cyber-android geometry, reference annotations, camera or likeness target changed in this pass.

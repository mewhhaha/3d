# Chart-local PBR scalar-detail checkpoint

Date: 2026-09-17
Implementation revision: `9f5f2ec19c64185712716ac393cefaf843830785`
Base revision: `ccbc56645703c8562ae34186491c9179e5889b11`

## Reusable capability

Added `chartScalarTexture()` and `packMetallicRoughness()` so the existing semantic UV-chart workflow can author independently editable linear scalar material-response fields and compile them into the standard Three.js/glTF metallic-roughness channel convention.

`chartScalarTexture()` reuses semantic chart names, chart-local 0..1 coordinates, atlas rotation compensation, and the existing fill/rectangle/ellipse/line vocabulary, but expresses one explicit scalar `value` from 0 through 1 rather than color. Output is RGBA8 `NoColorSpace` data. `packMetallicRoughness()` takes compatible roughness and metalness scalar textures, copies their sampler/UV-transform contract, writes roughness to G and metalness to B, and owns fresh pixel storage so the source fields remain independently editable and disposable.

Before this checkpoint, compact code-first chart detail could change base color but authors still needed recipe-specific pixel loops or separate image tooling to vary roughness/metalness over the same semantic marking. The new operations keep geometry, chart placement, color design, scalar response, channel packing, material factors and material binding as separate construction stages.

## Research

- Three.js project, `MeshStandardMaterial` documentation and locked r186 shader chunks, accessed 2026-09-17: roughness maps are sampled from G and metalness maps from B; both are non-color data and multiply the material scalar factors. This directly set the channel/color-space contract and the example's factor-1 absolute-value convention where appropriate.
- Khronos Group, *glTF 2.0 Specification*, accessed 2026-09-17: `metallicRoughnessTexture` uses G for roughness and B for metallic, with linear transfer; base-color RGB is sRGB. This motivated exporting standard packed data rather than introducing a custom shader encoding.
- Blender Foundation, *Principled BSDF*, Blender 5.3 manual, accessed 2026-09-17: roughness and metallic are distinct 0..1 material-response controls, not geometric detail. This reinforced keeping scalar authoring out of geometry/sculpt operations.
- Detailed notes: `docs/research/chart-pbr-detail.md`.

## Exercised examples

1. Organic fixture: a curved creature shell uses `creature.cheek` for base-color markings plus a smoother roughness field over the marking while metalness remains zero.
2. Mechanical fixture: a subdivided service housing uses `panel.service` for an independently authored painted/exposed-metal treatment with both roughness and metalness variation.

The two subjects share the same chart/scalar/packing API but materially different surface-response intent. Neither API encodes subject dimensions, anatomy, filenames, reference coordinates or camera assumptions.

## Checks and evidence

- `npm run doctor`: Three.js r186; Chromium 144.0.7559.96; WebGL2; SwiftShader.
- Dedicated scalar/packing tests: **3/3 passed**.
- Focused chart-PBR/chart-texture/UV-chart/material-region/render-primitive suite: **20/20 passed**.
- Targeted `surface-pbr-study` model metadata/default-build/determinism/parameter check: **1/1 passed**.
- `npm run build`: **43 recipes**.
- Controlled study: **4 cases / 48 locked-camera material, clay, wire and silhouette renders**, status passed, `visualAcceptance: "not-assessed"`.
- Plain and PBR combined cases are both **4 meshes / 48 render primitives / 4,515 vertices / 5,340 triangles / 6 materials**, with identical bounds. Organic-only is **3,696 triangles / 2,061 vertices**; mechanical-only is **1,644 / 2,454**.
- Plain -> PBR silhouette IoU is **1.0** in front, three-quarter and side views, confirming material-response changes without geometric silhouette changes.
- Material-pass RGB difference is measurable while geometry controls remain stable: front mean absolute error **0.012906**, three-quarter **0.012561**, side **0.006058**.
- All four study GLBs validate with **0 errors / 0 warnings**. Direct GLB JSON inspection shows standard `metallicRoughnessTexture` bindings rather than a runtime-only shader path.
- Study source fingerprint: `04c8eee26b9f9e0d5e56a77c8745063cfdc178b86ec82fb73d9a95c929c3ce28` over 191 source files.
- A bounded repository-wide `npm test` attempt reached at least **132 passing tests / 0 failures** before the execution bound; no complete full-suite local pass is claimed.

## Visual inspection

The locked contact sheet and direct front-material comparison show identical form in plain/PBR cases. The mechanical fixture gains an intentionally stronger polished/exposed-metal response against its painted inset; the organic roughness variation is subtler but visible as a surface-response change rather than a color or geometry edit. Clay, wire and silhouette views remain unchanged. These are workflow fixtures and are intentionally not given a finished-art aesthetic score.

## Export and ownership checks

The packed texture uses fresh RGBA8 storage and rejects mismatched dimensions, color-space intent, sampler state or UV transforms rather than silently choosing one source contract. Material scalar factors remain explicit because Three.js/glTF multiply the maps by `roughness`/`metalness`; the helper does not infer those factors or physical material values. Geometry, named regions, UV charts and anchors are not mutated by scalar texture generation or packing.

## Rejected approaches

- Add roughness/metalness options directly to `chartTexture()`: rejected because color-space and scalar semantics differ; keeping the scalar operation explicit makes accidental sRGB material data harder.
- Add one universal procedural material builder: rejected because it would entangle chart generation, channel packing, PBR factors and material ownership, reducing reuse across different material systems.
- Invent a custom shader/encoding for procedural response: rejected because Three.js r186 and glTF already share a portable G/B metallic-roughness convention.
- Synthesize normal detail in the same pass: rejected because normal authoring requires tangent-space and high/low-surface validation contracts that are materially different from scalar map packing.

## Limitations and next workflow priority

The first scalar layer is RGBA8 and 0..1 only. It does not generate normal/height maps, bind occlusion, pack a complete ORM texture, author clearcoat/transmission/anisotropy, infer measured material values, produce KTX2/compressed images, or provide interactive painting. The simple shapes remain intentionally code-first and chart-local.

Next priority: move to a different part of the creative loop and add a reusable authored shot/lighting assembly API: explicit camera targeting/framing plus portable punctual-light rigs that can be reused across an organic subject and an unrelated prop/environment, while keeping preview lighting, scene ownership and export behavior separable. This addresses repeated scene-presentation work rather than successively polishing the same texture fixture.

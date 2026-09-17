# Research note — chart-local scalar detail and metallic-roughness packing

Accessed 2026-09-17. Scope: one bounded follow-up to semantic chart texture authoring: reusable scalar fields for material response and portable glTF/Three.js metallic-roughness packing. This is not a general material-authoring survey.

## Three.js — `MeshStandardMaterial`

Source: https://threejs.org/docs/pages/MeshStandardMaterial.html

Observation: current Three.js documentation says `roughnessMap` is non-color data sampled from the **green** channel and multiplied by the material's scalar `roughness`; `metalnessMap` is non-color data sampled from the **blue** channel and multiplied by scalar `metalness`. Base-color `map`, by contrast, is color data normally tagged sRGB.

Version check: the repository is locked to Three.js r186. Its local `ShaderChunk/roughnessmap_fragment.glsl.js` samples `.g` and `metalnessmap_fragment.glsl.js` samples `.b`, explicitly noting compatibility with combined occlusion/roughness/metallic RGB textures.

Intended operation: keep chart-local authoring independent from final material binding. `chartScalarTexture()` reuses the existing chart-space rasterizer but emits explicit linear 0..1 data. `packMetallicRoughness()` packs roughness into G and metalness into B while keeping the source scalar maps independently editable.

Test/example/result: focused tests sample authored scalar values after atlas packing, verify exact G/B channel placement, verify the packed result does not alias source pixel storage, and reject mismatched dimensions/UV-transform/sampler state. The organic fixture varies roughness only; the mechanical fixture varies roughness and metalness over a service panel. The controlled study exports standard `MeshStandardMaterial` GLBs with zero validator errors/warnings.

Limitations: material scalar factors still multiply the maps, so authors must choose factors deliberately. This helper does not infer physically correct roughness/metalness values, normal maps, clearcoat, anisotropy, transmission, or lighting.

## Khronos — glTF 2.0 Specification

Source: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

Observation: glTF's metallic-roughness model packs roughness in the green channel and metalness in the blue channel of one linear texture. Factors multiply sampled texture values. Base-color RGB uses sRGB transfer, whereas the metallic-roughness texture uses linear transfer.

Intended operation: make the repository's procedural chart detail export in the same channel convention rather than inventing a custom shader encoding. The packed texture is `NoColorSpace`, RGBA8, with neutral red/alpha values; only G/B are claimed by this helper.

Test/example/result: a direct inspection of the exported `surface-pbr-study` GLB JSON shows `metallicRoughnessTexture` bindings on the PBR materials. All study GLBs validate with zero errors/warnings and retain identical geometry between constant-response and chart-PBR cases.

Limitations: this helper does not bind occlusion, choose secondary UV sets, create KTX2/compressed images, or guarantee shader equivalence outside the standard glTF metallic-roughness interpretation.

## Blender 5.3 Manual — Principled BSDF

Source: https://docs.blender.org/manual/en/dev/render/shader_nodes/shader/principled.html

Observation: Blender documents roughness as a 0..1 microfacet-roughness control and metallic as a 0..1 blend between dielectric and metallic base-layer behavior. They are distinct material-response controls rather than geometric detail.

Intended operation: preserve the repository's separation of form, UV/chart placement, texture generation, and material response. A chart-local scalar field changes surface response without changing the mesh or its silhouette, and the study keeps clay/wire/silhouette views as mechanical controls.

Test/example/result: plain and PBR study cases have identical triangle/vertex counts, bounds, and silhouette IoU 1.0 in all locked views; only material-pass RGB changes.

Limitations: these values are artistic/material parameters, not measurements of a real material. The helper intentionally does not attempt material scanning or automatic semantic classification.

## Implementation decision

Add two small composable operations instead of a universal material builder:

- `chartScalarTexture(geometry, spec)` authors one linear 0..1 field with the same semantic chart names and shape vocabulary as `chartTexture()`.
- `packMetallicRoughness(roughness, metalness)` combines two compatible linear RGBA8 scalar textures into the standard G/B packing while leaving material creation/binding explicit.

This keeps color design, scalar response, atlas placement, geometry ownership, and material factors independently editable. It also provides an immediate reuse path for organic wet/dry markings and unrelated painted/exposed-metal panels without coupling either subject to repository-global dimensions or a reference scene.

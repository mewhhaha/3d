# Research note — procedural surface detail on semantic UV charts

Accessed 2026-09-17. This note records only the source observations used for the bounded chart-texture authoring layer; it is not a general texture-painting survey.

## Blender 5.2 LTS Manual — Texture Paint / Introduction

Source: https://docs.blender.org/manual/en/latest/sculpt_paint/texture_paint/introduction.html

Observation: Blender describes a UV texture as a flat image mapped to mesh faces through UV coordinates. The Image Editor and 3D Texture Paint views edit the same image through that mapping. The manual also notes that power-of-two square images are a useful memory/performance choice and calls overlapping UVs a known limitation for painting when one stroke reaches multiple faces sharing texture space.

Adaptation: the repository keeps chart projection/packing separate from paint-like detail generation. `chartTexture()` assumes the existing semantic chart/atlas stage has already established the intended non-overlapping texture space and expresses marks in chart-local 0..1 coordinates rather than view/projective coordinates. Texture size is bounded to power-of-two square RGBA8 images.

Test/example: the organic fixture paints asymmetric face/crown markings after packing, while the mechanical fixture paints a warning-panel graphic and header trim using the same layer vocabulary. Plain and detailed cases retain identical geometry and silhouette.

Limitations: this is not interactive 3D texture painting, brush projection, clone/stencil painting, or automatic UV conflict repair.

## Three.js — DataTexture

Source: https://threejs.org/docs/pages/DataTexture.html

Observation: `DataTexture` directly accepts typed pixel data; RGBA + unsigned-byte data maps naturally to four byte components per texel. Current documentation notes that DataTexture defaults differ from ordinary image textures: `flipY` and mip generation default to false, filters default to nearest, and color space defaults to no-color-space.

Version check: the repository is locked to Three.js r186. Its local `src/textures/DataTexture.js` has the same relevant defaults. The existing `src/lib/export-assets.js` bridge accepts RGBA8 `DataTexture`s, converts export-owned copies to canvases, and preserves color space, flip direction, wrapping/filter state, UV transforms, and mipmap intent before GLB export.

Adaptation: `chartTexture()` emits an ordinary RGBA8 `DataTexture`, explicitly sets `flipY=false`, clamp wrapping, linear filtering with generated mipmaps, and uses either sRGB or no-color-space according to author intent. No custom shader or runtime-only texture type is required.

Test/example: focused tests verify sRGB color textures and linear masks, and the workflow study exports/re-imports two textured subjects through the existing GLB path with zero validator errors/warnings.

Limitations: only RGBA8 output is authored here. Normal/height synthesis, channel packing, anisotropy policy, compressed GPU formats, and external image editing remain separate concerns.

## Khronos — glTF 2.0 Specification

Source: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

Observation: glTF binds material textures through texture coordinates such as `TEXCOORD_0`. For metallic-roughness materials, base-color texture RGB is sRGB-encoded while its alpha component is linear coverage; metallic/roughness texture channels are linear. The base-color factor multiplies sampled texture values.

Adaptation: the chart texture helper makes color-space intent explicit instead of guessing from material slot use. The example color maps use sRGB; a separate linear-mode test demonstrates mask-oriented output. The existing material and export layers remain responsible for how a texture is bound to a PBR slot.

Test/example: exported study GLBs preserve both textures and all 96 material/render primitives while retaining the original 4,804 triangles and 4,298 vertices in the combined plain/detailed cases.

Limitations: `chartTexture()` does not decide material slot semantics, alpha mode, emissive/normal/ORM packing, secondary UV sets, or sampler extensions.

## Implementation decision

Use a tiny CPU rasterizer over already-authored semantic chart rectangles. Layers address a chart by the exact named face region whose stored ranges match that projected chart (or by numeric index for composite/low-level use), and shape coordinates remain in the chart's original 0..1 local frame. The rasterizer inverts atlas packing rotation when evaluating each pixel, so a mark does not rotate in author space merely because the atlas packer rotated the island by 90 degrees. The first vocabulary is intentionally small: fill, rectangle, ellipse, and line. These are enough to demonstrate organic markings and hard-surface labels/trims without introducing fonts, SVG parsing, a scene-space paint system, or another rendering dependency.

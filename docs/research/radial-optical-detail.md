# Geometry versus optical detail — 2026-09-19

## Primary sources actually read

- Three.js, **MeshStandardMaterial documentation**,
  https://threejs.org/docs/pages/MeshStandardMaterial.html, accessed 2026-09-19.
  Observed: normal maps alter lighting, not surface shape; emissive maps multiply
  emissive color and intensity and are color data. Adaptation: retain the port
  housing/lens shape as geometry and author color/emission separately; do not
  manufacture a normal-bake claim for a flat optical pattern. Locked r186
  `emissivemap_fragment.glsl.js` and exporter behavior were checked locally.
- Khronos, **glTF 2.0 specification**, materials/emissiveTexture,
  https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html, accessed 2026-09-19.
  Observed: emissive texture bytes use sRGB transfer and must be decoded before
  computation; emissive factors are linear multipliers. Adaptation: interpolate
  and average emitted radiance in linear space, encode the finished map as sRGB,
  bind standard material textures, and inspect actual exported GLB bindings.

The English Three.js color-management manual returned a fetch error, as did the
Blender bake-manual URL. Those failed fetches are not evidence of having read
those pages this run. No construction videos were watched and no third-party
assets were copied.

## Concrete modeling decision

The previous ports were bright narrow toruses separated by black gaps. The
supplied illustration's visible lenses use broader, softer, multicolored bands
and warm cores. This pass changes that optical design on genuine shallow-cap
geometry, with a switch retaining the previous construction. It is not a texture
projection of the reference. No generated image or normal texture replaces the
3D scene.

The reusable operation is `radialProfileMaps`, used for the emitters and a
non-emissive ceramic saddle tile. The latter exposed an initial UV error: applying
the face map to the solidified rim repeated the radial pattern on the edge. The
accepted fixture uses existing face-region material assignment to map only the
outer surface. This is an actual use of the workflow's separate geometry,
material ownership, and UV/detail stages.

Tests cover linear interpolation, independent emission weights, symmetry,
invalid inputs, deterministic pixel ownership, lens normals/winding, retained
port housings, and unchanged scene attachments. Render/export evidence and the
side-view limitation are recorded in the containing checkpoint. Texture storage
and fragment sampling increase; no universal performance gain is claimed.

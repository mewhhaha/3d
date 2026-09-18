# Radial color and emission profiles

`src/lib/radial-profile-maps.js` provides `radialProfileMaps()`: independently
editable optical/paint detail in a square UV domain. It returns ordinary owned
`map` and `emissiveMap` DataTextures for standard glTF-compatible materials.

```js
const maps = radialProfileMaps({
  name: 'Signal lens', size: 256, samples: 2,
  center: [.5, .5], radius: .5, // UV units, not object metres
  stops: [
    [0, '#ff8d35', .8],
    [.3, '#ffe8ab', 1],
    [.7, '#b762b1', .5],
    [1, '#49646b', 0],
  ],
});
const finish = material('#ffffff', {
  ...maps, emissive: '#ffffff', emissiveIntensity: .8,
  roughness: .45, metalness: 0,
});
```

Each stop is `[normalizedRadius, sRGBHex, emissionWeight=1]`. Radii must increase
strictly and include both 0 and 1. Emission weight is 0..1. Overall radiance remains
an explicit material multiplier; these maps are not HDR. The UV center can lie
outside the image for an off-center pattern. Samples beyond radius clamp to the
last stop. Size is a power of two, 16..1024; `samples` is 1, 2, or 4 **per axis**.

Interpolation and subpixel averaging operate on linear color and independently
on emitted radiance. The results are encoded as sRGB RGBA8, including the emissive
map. Alpha is opaque. Texture addressing is clamp-to-edge with mipmapped linear
filtering. The operation is deterministic and does not mutate source stops.
Each call owns new arrays/textures; callers dispose them with their material.

## Geometry and normal maps remain separate

Use these maps on a surface with suitable UVs. A radial texture cannot form a
hole, cast a silhouette, produce ring parallax, or create a normal map. The new
android `emitterStyle: mapped` deliberately replaces fine torus stacks with a
shallow lens while retaining housings, bezels, outer rims and screws. This is a
**changed optical design**, not an equivalent low-poly copy or high-to-low bake.
The full hero silhouette is unchanged in the reviewed view, but the isolated
port's side silhouette changes; retain the ring variant for exposed mechanisms.

The signal lens has analytic geometric normals and planar XY UVs. No fake normal
map is supplied. The previous head's bake/illustration contracts remain separate.
Emission does not create dynamic scene lights in the raster renderer.

The same maps also color a non-emissive curved ceramic tile. Existing semantic
material regions restrict the glaze to `tile.outer`; inner/rim faces remain
unmapped. Do not apply a front-face projection indiscriminately to a solidified
rim's unrelated UV chart.

## Review

```sh
npm run render -- studies/prism-signal.js --views front,side,threequarter --glb
npm run render -- studies/radial-enamel.js --views threequarter,side --glb
node scripts/review-signals.mjs
```

The review fixes cameras, exports standard material maps, validates GLBs, and
compares silhouettes. It does not assess reference likeness automatically. New
maps trade texture memory and sampling for fewer vertices/draw calls; fewer
triangles alone is not a frame-rate or quality claim.

Sources and design decisions: [radial optical detail](research/radial-optical-detail.md).

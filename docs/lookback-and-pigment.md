# Gesture before polish; pigment separate from geometry

## Section proportions and pose

`sectionPose(stations)` now accepts optional positive `scale: [x,y,z]` per
station. Values must be finite in `(0,4]`; omitted scale is exactly `[1,1,1]`.
Scale, offset and quaternion rotation interpolate independently using the
existing smoothstep blend. A point and a socket sampled at the same section
use the same transform. This changes form and attachment spacing, **not** limb
lengths. The caller re-solves attached chains with `twoLinkPose` afterwards.

```js
const posing = sectionPose([
  {y: 0},
  {y: .25, scale: [.75, 1, 1], rotation: [0, 20, 0]},
  {y: .5, scale: [.55, 1, 1], rotation: [0, 35, 0]},
]);
const support = (u,v) => posing.point(restSurface(u,v));
const socket = posing.point(restSocket, .5);
```

Outside the station interval, the end transform is constant. With a non-unit
scale this is affine, not rigid (old unscaled behavior remains rigid). This is
not a deformer for weighted/animated skins, a collision solver, or volume
preservation. Rebuilding geometry recomputes geometric normals. Existing bakes
and anchors do not automatically transfer to changed supports.

`gestureStyle: lookback` in the android is an explicitly different hypothesis,
not a replacement for manual observations. It narrows the rib/shoulder section,
turns it relative to the pelvis, and offsets the waist. Upper/lower arms and legs
are re-solved to existing wrists/ankles with unchanged leg lengths. The new arm hypothesis uses .285/.265m instead of
.25/.30m, preserving total .55m reach, and an explicit near-arm bend-plane turn.
These are authored proportions, not recovered skeleton measurements. Head, camera,
reference annotations and planted feet remain unchanged. Optical centers on
changed arm frames can move; this variant does not claim unchanged scores.

## Boundary-following pigment maps

`contourLineMaps(geometry, options)` consumes original `surfaceContourGeometry`
UV/boundary provenance and returns separate `map` (sRGB) and `roughnessMap`
(NoColorSpace) textures. It measures distances to the actual rounded boundary
samples, including hole loops, then rasterizes an inset pigment line and an
interrupted warm edge accent. This is paint, **not** a groove, normal map or
high-to-low bake. Geometry is never changed.

`size` is a power of two 32..1024. `lineWidth` and `inset` are in normalized chart
bounding-rectangle units, not world metres. UV metric distortion still matters.
The operation uses standard UV scale/offset transforms to fit each chart; apply
maps only to its outer surface using `assignFaceMaterials`, not the separately
parameterized shell rim. Existing UV transforms/atlases must not be silently
reused as if this provenance were unchanged.

`applyContourLook()` is a look-development stage **after** all replacements, so
it does not allocate maps for temporary armor. `surfaceStyle: pigment` uses the
portable PBR appearance; `surfaceStyle: outlined` adds the already existing
`twoToneMaterial` with an explicit authored key direction. This is not the actual
scene light/shadow solution; GLB receives standard PBR fallback plus intent
metadata. Both variants have identical positions/normals/UVs/tangents/indices.
A 128x128 pair costs 128 KiB RGBA8 before mipmaps per coated part. It increases
texture sampling/storage and material groups; no frame-rate claim is made.

An independent tapered inspection cover (`studies/posed-enamel.js`) demonstrates
section scaling and the pigment operation, including an interior aperture.
`node scripts/review-lookback.mjs` compares old pose, pose-only, pigment/PBR,
pigment/two-tone and fixed alternate views plus the independent cover.

# Semantic UV charts

`src/lib/uv-charts.js` adds a bounded UV authoring step for ordinary indexed `BufferGeometry`. It is intended for decals, trim patches, masks, labels and controlled local texture space when a named face region already expresses the modeling intent.

```js
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { projectFaceRegionUVs, remapUvChartAnchor } from '../src/lib/uv-charts.js';

const tagged = defineFaceRegions(geometry, {
  'panel.service': ({ centroid, normal }) => normal.z > .9 && Math.abs(centroid.x) < .25,
});
const charted = projectFaceRegionUVs(tagged, [{
  region: 'panel.service',
  frame: { origin: [0, 0, 0], uAxis: [1, 0, 0], vAxis: [0, 1, 0] },
  atlas: [.05, .05, .45, .45],
  padding: .04,
}]);
const movedAnchor = remapUvChartAnchor(charted, anchorBoundBeforeCharting);
```

The projection frame is geometry-local and explicit. Each chart is normalized from the selected face corners into its `atlas` rectangle. Unassigned faces keep their existing UVs by default. Set `{ preserveUnassigned: false }` when charts deliberately cover every face and the source has no UV map.

## Topology and ownership contract

A UV seam is face-corner data, while Three.js `BufferGeometry` attributes are vertex-domain parallel arrays. `projectFaceRegionUVs()` therefore keeps triangle order and every 3D face corner unchanged, but duplicates a source vertex when incident corners need different UV coordinates. Ordinary non-interleaved vertex attributes are copied to each duplicate. Existing face groups and named face-region metadata remain valid because face order is unchanged. Existing tangents are recomputed against the new UVs.

The returned `geometry.userData.uvCharts` records the source topology signature, source vertex for every target vertex, and source-face-corner to target-vertex provenance. A persistent anchor bound before charting no longer has the target topology signature; `remapUvChartAnchor()` verifies that provenance and transfers it to the exact same face/corners. Morph targets are rejected until they have an explicit duplication contract. Interleaved attributes are also rejected rather than silently copied incorrectly.

This operation is intentionally not a general unwrap or packer. It does not run LSCM/ABF, optimize distortion, infer seams, pack arbitrary islands, paint textures, or remap unrelated topology-changing dependencies. Use it when explicit planar projection is the useful authoring control; use a dedicated unwrap workflow when distortion minimization is the real problem.

## Inspect and pack already-authored charts

Chart projection and atlas placement are separate authoring decisions. After projecting two or more semantic charts, use `inspectUvCharts()` to measure their actual UV layout, then `packUvCharts()` when the intended result is a non-overlapping shared atlas:

```js
import { projectFaceRegionUVs } from '../src/lib/uv-charts.js';
import { inspectUvCharts, packUvCharts } from '../src/lib/uv-atlas.js';

const projected = projectFaceRegionUVs(tagged, [
  { region: 'panel.service', atlas: [.05, .05, .55, .45], padding: .04 },
  { region: 'panel.header',  atlas: [.30, .20, .85, .55], padding: .04 },
]);

const before = inspectUvCharts(projected);
const packed = packUvCharts(projected, {
  target: [0, 0, 1, 1],
  margin: .02,
  rotate: true,
  density: 'equalize',
});
const after = inspectUvCharts(packed);
```

`inspectUvCharts()` reports, per chart, declared atlas bounds, actual occupied bounds, 3D and UV area, average texel density, degenerate UV faces, maximum/RMS angular distortion, and scale-independent area-stretch ratios. It also performs exact triangle clipping between different charts and reports positive-area UV overlaps. The area-stretch metric is normalized to each chart's average density so choosing a larger atlas rectangle is not itself mislabeled as distortion.

`packUvCharts()` uses a deterministic bounding-rectangle shelf pack. It moves each complete chart as one island, applies one uniform global scale, and may rotate islands by 90 degrees. `margin` is an explicit UV-space distance. `target` may reserve a sub-rectangle of the 0..1 tile. `density: 'preserve'` keeps the authored relative chart scales; `density: 'equalize'` explicitly normalizes average UV-area / surface-area density before packing. Density normalization is opt-in because texel density and placement are different authoring choices.

Packing does not move 3D vertices, reorder faces, change named face regions, or reinterpret material groups. The projector now always splits chart ownership even when two chart corners happen to have numerically identical UV values, so later atlas edits cannot accidentally modify a neighboring chart or an unassigned source face. Existing persistent anchors remapped through the projection remain valid after packing because packing is UV-only and keeps the charted indexed topology unchanged.

This is deliberately not a general polygon-nesting or unwrap solver. The packer uses authored chart rectangles rather than exact concave island outlines, so it may waste atlas area compared with a production packer. It does not minimize distortion, infer seams, merge mirrored islands, pack UDIMs, enforce pixel-rounded gutters, or reason about mip bleed. `inspectUvCharts()` exposes planar-projection distortion; it does not repair it.

## Paint portable detail in chart-local coordinates

Once charts have been projected and optionally packed, `chartTexture()` can rasterize small procedural markings into an ordinary exportable RGBA8 `DataTexture` without coupling texture authoring to final atlas coordinates:

```js
import { chartTexture } from '../src/lib/chart-textures.js';

const map = chartTexture(packed, {
  size: 256,
  background: '#ffffff',
  layers: [
    { chart: 'panel.service', shape: 'fill', color: '#d9ddda' },
    { chart: 'panel.service', shape: 'rect', center: [.5, .5], size: [.7, .5], color: '#4e595e' },
    { chart: 'panel.service', shape: 'line', from: [.25, .3], to: [.75, .7], width: .08, color: '#e0a33b' },
  ],
});
```

Layer coordinates are always in the chart's authored 0..1 local frame. Atlas translation, scale, and cardinal rotation remain separate placement decisions; `chartTexture()` reads the current chart metadata and compensates for pack rotation while rasterizing. When a projected chart exactly matches one named face region, `chartTexture()` resolves that semantic region name back to the chart from the stored face ranges. Numeric chart indices remain available for composite/low-level cases whose chart does not have one exact semantic-region identity. This deliberately avoids adding a second chart-naming system to projection metadata.

The first primitive vocabulary is `fill`, `rect`, `ellipse`, and `line`, with per-layer color and opacity. `colorSpace: 'srgb'` is the default for base-color-like output; `colorSpace: 'linear'` creates no-color-space data suitable for masks or other linear channels. Output is power-of-two RGBA8 `DataTexture`, `flipY=false`, clamp wrapped, linearly filtered, and mipmapped so it follows the repository's existing DataTexture → GLB export bridge rather than introducing a custom shader dependency.

Texture generation does not mutate geometry, UVs, face regions, material groups, anchors, or chart placement. It is deliberately not a 3D brush engine, font/SVG renderer, normal-map baker, channel packer, automatic decal projector, or full texture-compositing system. Use it for compact code-first markings, labels, masks and trim whose shape intent belongs in semantic chart-local space.

## Author scalar PBR response without changing chart placement

`chartTexture()` is for RGBA color-like detail. Material response often needs linear scalar fields instead: a wet organic marking may be smoother than the surrounding shell, while an exposed hard-surface insert may be both smoother and more metallic. `src/lib/chart-pbr.js` keeps those concerns separate:

```js
import { chartScalarTexture, packMetallicRoughness } from '../src/lib/chart-pbr.js';

const roughness = chartScalarTexture(packed, {
  background: .72,
  layers: [
    { chart: 'panel.service', shape: 'fill', value: .55 },
    { chart: 'panel.service', shape: 'rect', center: [.5, .5], size: [.65, .4], value: .22 },
  ],
});
const metalness = chartScalarTexture(packed, {
  background: 0,
  layers: [
    { chart: 'panel.service', shape: 'fill', value: .1 },
    { chart: 'panel.service', shape: 'rect', center: [.5, .5], size: [.65, .4], value: .9 },
  ],
});
const orm = packMetallicRoughness(roughness, metalness);

const panel = material('#ffffff', {
  roughness: 1,
  metalness: 1,
  roughnessMap: orm,
  metalnessMap: orm,
});
```

Scalar layers use `value: 0..1`, not color, but otherwise reuse semantic chart names plus the same `fill`, `rect`, `ellipse`, and `line` vocabulary and chart-local coordinates. Output is linear `NoColorSpace` RGBA8 data. `packMetallicRoughness()` writes roughness to G and metalness to B, matching Three.js r186 and glTF 2.0; it rejects mismatched image dimensions or UV-transform/sampler state instead of silently choosing one source's sampling contract. The returned packed texture owns new pixel storage, so the roughness and metalness source maps remain independently editable/disposable.

Texture packing does not decide the material's scalar factors: Three.js/glTF multiply texture values by `roughness` and `metalness`, so use factor `1` when the map stores absolute authored values. The helper does not synthesize normals, infer physically measured material values, bind occlusion, or create a monolithic material wrapper. Geometry, charts, scalar fields, packing, and material binding remain separate authoring stages.

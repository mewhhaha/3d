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

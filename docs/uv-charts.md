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

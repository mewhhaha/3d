# Semantic material regions

Use named face regions for authoring meaning, then map those names to render material slots when a hard face-wise material boundary is appropriate. The semantic region remains independent from Three.js draw groups, so the same region can also drive sculpt masks, spatial queries, attachments, transfer, or later topology provenance.

```js
import { defineFaceRegions } from '../src/lib/face-regions.js';
import { assignFaceMaterials } from '../src/lib/material-regions.js';
import { mesh, material } from '../src/lib/modeling.js';

const tagged = defineFaceRegions(indexedGeometry, {
  'panel.service': ({ centroid, normal }) => normal.z > 0.9 && Math.abs(centroid.x) < 0.2,
  'panel.header': ({ centroid, normal }) => normal.z > 0.9 && centroid.y > 0.12,
}, { clone: false });

const grouped = assignFaceMaterials(tagged, {
  'panel.service': 1,
  'panel.header': 2,
}, { defaultMaterial: 0 });

const object = mesh(grouped, {
  material: [
    material('#737d82'),
    material('#426c75'),
    material('#c2ad7c'),
  ],
});
```

`assignFaceMaterials()` requires indexed triangles and returns an owned clone. It does not reorder indices, split vertices, or change positions/UVs, so topology signatures, same-topology persistent anchors, and named face regions remain valid. The generated Three.js groups cover the complete index range in contiguous face-order runs. `faceMaterialIndices()` provides a diagnostic per-triangle view of the resulting slots.

By default, unassigned faces retain the source geometry's existing complete material groups. Pass a numeric `defaultMaterial` when semantic assignments should be layered over one explicit base slot. Existing groups must be triangle-aligned, non-overlapping, and cover every triangle; malformed ownership is rejected instead of guessed. Overlapping semantic regions may target the same slot, but conflicting material slots on the same triangle fail explicitly.

`mesh()` accepts either one material or a non-empty material array, matching Three.js multi-material meshes without forcing recipe-local `new THREE.Mesh(...)` boilerplate. Materials remain object-owned authoring data; geometry metadata stores only integer slot assignments, never Material instances.

This operation is for discrete face-wise material ownership. A smooth blend should stay in shader/texture data rather than creating many draw groups. It is also deliberately not a UV unwrapping operation: UV seams can require duplicate vertices because one geometric vertex may need different texture coordinates on adjacent islands. Treat that as an explicit topology-changing stage with its own provenance/transfer contract.

`models/material-regions-study.js` and `studies/material-regions.json` exercise the API on a stylized organic shell and an unrelated hard-surface service panel. Baseline and assigned cases keep identical geometry/silhouette while only material ownership changes.

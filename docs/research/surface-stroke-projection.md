# Surface-aware stroke projection and edge-distance masks

Accessed: 2026-09-17. Project dependency checked locally: Three.js r186.

## Blender Manual — Sculpt Controls / Auto-Masking

Source: https://docs.blender.org/manual/en/5.3/sculpt_paint/sculpting/controls.html

Observation: Blender documents topology auto-masking as restricting a stroke to vertices topologically connected to the stroke start, explicitly preventing loose nearby islands from being affected. Face Sets and normal-facing auto-masks can be combined with topology.

Adaptation: keep semantic face-region filtering separate from surface connectivity. `projectSurfacePath()` chooses an intended support using named regions; `surfacePathSelection()` then propagates influence only through the indexed mesh graph instead of using free-space distance. This is not an implementation of Blender's interactive brush state or its full auto-masking system.

Test/example: a two-layer service panel places a backing sheet 38 mm behind the front sheet. The legacy Euclidean path radius can reach both sheets; the projected edge-distance selector binds to `part.front` and leaves the disconnected backing sheet at zero weight.

Limitations: connected geometry can still be reached if its shortest edge route is within the requested radius. Region constraints remain important when the topology intentionally connects semantically distinct areas.

## Blender Manual — Shortest Edge Paths Node

Source: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/mesh/read/shortest_edge_paths.html

Observation: Blender's Shortest Edge Paths node computes vertex-domain shortest paths with Dijkstra's algorithm; edge length is documented as a natural edge cost.

Adaptation: use accumulated edge length as a bounded, dependency-free approximation to surface distance around projected stroke samples. Seed each projected sample at the three vertices of its owning triangle using sample-to-corner distance, then run a radius-bounded Dijkstra propagation. The result is a point-domain sculpt mask, not a path geometry generator.

Test/example: dedicated unit coverage verifies nearby disconnected geometry is not reached and that projected barycentric samples can be re-evaluated after same-topology position edits.

Limitations: edge shortest paths are mesh-resolution and triangulation dependent and are not exact continuous geodesics over triangle interiors.

## Three.js — BufferGeometry

Source: https://threejs.org/docs/pages/BufferGeometry.html

Observation: Three.js r186 documents indexed triangles as three vertex indices per face and notes that indexed geometry shares vertices across triangles.

Adaptation: the surface selector uses that explicit indexed vertex graph for adjacency and keeps projected sample ownership as triangle/corner/barycentric data. It rejects changed corner order instead of silently reusing stale projected samples.

Result: no new runtime dependency is required; the operation stays inside the repository's ordinary `BufferGeometry` authoring layer.

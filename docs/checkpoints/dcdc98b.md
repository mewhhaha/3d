# Checkpoint — `dcdc98b` semantic UV chart projection

Implementation revision: `dcdc98b2788e28271244d0b4fd814c2e01e86f64`.
Base revision: `0b85d15b1b804d750d6a69c6830246340c5d7351`.
Reusable capability: project named semantic face regions into explicit geometry-local planar UV charts while deterministically splitting only UV-discontinuous indexed vertices and retaining exact source face/corner provenance.

## Authoring change

Before this checkpoint, semantic face regions could drive sculpting, spatial queries, attachments and hard material slots, but a localized decal/checker/trim still needed recipe-specific UV coordinate surgery. `projectFaceRegionUVs()` now takes the same durable face semantics plus an explicit local U/V frame and atlas rectangle. It preserves face order and every 3D face corner, copies ordinary vertex attributes to seam duplicates, keeps face-region/material-group ownership valid, and recomputes tangents when the source owned them.

Because seam splitting changes indexed topology, old persistent surface anchors are not silently accepted. `geometry.userData.uvCharts` records source-vertex and face-corner provenance, and `remapUvChartAnchor()` verifies the source topology before transferring a bind-created anchor to the exact corresponding target triangle/corners. Morph targets and interleaved attributes are rejected in v1 until they have explicit transfer contracts.

## Research influence

- Blender 5.2 **Seams** documents UV discontinuity as an authored cut; adaptation: semantic region boundaries become explicit chart boundaries rather than pretending shared indexed vertices can hold multiple corner UVs.
- Blender 5.2 **UV Unwrap Node** exposes UV output on the face-corner domain; adaptation: Three.js vertex-domain attributes receive deterministic seam duplication with provenance.
- Blender 4.5 **Project from View** documents controlled planar projection and its stretching tradeoff; adaptation: serializable geometry-local `uAxis`/`vAxis` projection, independent from render camera state.
- Three.js **BufferGeometry / BufferAttribute** documents indexed vertex reuse and parallel per-vertex attributes; adaptation: every duplicated target vertex copies ordinary source attributes, while the index selects the correct UV-specific duplicate.

Detailed source notes and limitations are in `docs/research/uv-charts.md`.

## Distinct examples

`models/uv-chart-study.js` uses the same API on two materially different subjects:

- a curved stylized creature shell, where `creature.facePatch` receives a front planar chart;
- a hard-surface service housing, where `panel.service` uses a rotated local projection frame.

Both reuse named face regions and the preceding material-region capability so the charted area carries a checker material while the rest of each independently owned mesh stays unchanged.

## Local evidence

- `npm run doctor`: Three.js r186, Chromium 144.0.7559.96, WebGL2, SwiftShader.
- Focused face-region/material-region/surface-anchor/UV-chart tests: **30/30 passed**.
- Dedicated `uv-chart-study` metadata/default-build/determinism/parameter-limit test: **1/1 passed**.
- `npm run build`: passed with **40 recipes**.
- `node scripts/study.mjs studies/uv-charts.json renders/run33-uv-charts`: passed, **4 cases / 48 locked-camera material, clay, wire and silhouette renders**.
- Baseline and charted combined cases stay at **4,412 triangles**; seam splitting increases vertices from **3,946 to 4,021** without changing bounds or 3D corners. Organic-only: **2,880 triangles / 1,627 vertices**. Mechanical-only: **1,532 / 2,394**.
- All four study GLBs validate with **0 errors / 0 warnings**.
- Baseline → charted silhouette IoU is exactly **1.0** in front, three-quarter and side views. Material error changes because UV placement intentionally changes.
- Source fingerprint at the controlled study: `e52509e36a15645a962f5b746aed97e64aa2132252165d6114ee58cf024ab226` over 182 files.
- A bounded repository-wide `npm test` attempt reached test **126 with zero failures** before the execution bound; this is not a complete full-suite pass.

## Visual inspection

The contact sheet shows the organic face patch changing from the source sphere's stretched/banded UVs to a much more regular front checker chart. The hard-surface service inset remains a regular checker under its rotated projection. Clay, wire and silhouettes are unchanged; the wire inspection confirms the operation changes indexed ownership only where UV discontinuity requires duplicates, not the 3D tessellation itself. `visualAcceptance` remains `not-assessed` because these are workflow fixtures rather than finished assets.

## Rejected scope

This checkpoint intentionally does not implement LSCM/ABF, automatic seam inference, arbitrary island packing, texture painting or a universal topology dependency graph. Those would make a small useful projection tool responsible for unrelated unwrap/authoring problems. It also does not silently copy morph targets or interleaved attributes.

## Remaining limitations / next priority

Planar charts can stretch curved/oblique surfaces. Each chart currently normalizes its selected corners independently, atlas rectangles are author-provided, and there is no distortion metric or automatic packing. The next general workflow priority is **reusable chart inspection and atlas packing for already-authored charts**, including UV overlap/bounds/stretch diagnostics and deterministic placement, before considering a more complex unwrap solver.

No cyber-android geometry, reference annotations, camera or likeness target changed in this pass.

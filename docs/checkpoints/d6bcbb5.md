# Checkpoint d6bcbb5 — sweep-space semantic face regions

Date: 2026-09-16
Base revision: `5d50f1325392c0d9566c5bef4945157b2cdd4d00`
Tested implementation revision: `d6bcbb503feb0ccaf44276b79f0630598bc661e4`

## Reusable capability

`profileSweepGeometry()` now resolves semantic face regions directly from the same guide/profile construction coordinates that create the mesh. An optional `regionPrefix` exposes exact structural roles (`<prefix>.side`, `<prefix>.cap.start`, `<prefix>.cap.end`), while `faceRegions` predicates receive normalized path intervals, normalized profile-perimeter intervals, profile-edge IDs, and cap roles. Predicates are evaluated during construction; only ordinary named face-region ranges remain on the returned geometry.

This removes a recurring authoring workaround: selection on a swept leaf, strap, trim, horn or hair-card no longer needs world-space centroid thresholds or tessellation-specific triangle IDs. Rebuilding at a different segment count regenerates the intended region from construction data instead of pretending old face numbers are stable.

## Research and implementation decision

- Blender 4.5 LTS Manual, Curve to Mesh Node: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/curve/operations/curve_to_mesh.html — documents path/profile separation, generated mesh attributes, and optional end caps. Adaptation: the sweep constructor exposes exact side/start-cap/end-cap face roles from its own face ordering.
- Blender 4.5 LTS Manual, Spline Parameter Node: https://docs.blender.org/manual/en/4.5/modeling/geometry_nodes/curve/read/spline_parameter.html — documents normalized spline progress and warns that evaluated points are not authored control-point indices. Adaptation: path predicates use the same arc-length-normalized `getPointAt()` parameter sampled by the transported-frame builder.
- Three.js r186 BufferGeometry: https://threejs.org/docs/pages/BufferGeometry.html — groups are draw/material partitions and custom metadata belongs in application-owned data. Adaptation: overlapping authoring regions stay in the repository's face-region metadata rather than material groups.
- Full bounded notes: `docs/research/profile-regions.md`.

## Examples and visual evidence

`models/profile-region-study.js` exercises two distinct subjects. The organic fixture is an open profiled leaf whose normalized-path tip and profile-center ridge are authored before tessellation and then preserved through `solidifyGeometry()`, including an inherited tip/rim intersection. The mechanical fixture is a closed profiled service strap whose middle-span service flank, root mount zone, and structural end cap drive highlights and an attachment query.

Local review artifacts live under `renders/run18-profile-regions/`, including material/clay/wire/silhouette views for three locked cameras, a contact sheet, and one validated GLB per case. The first visual experiment was rejected because one service edge and the leaf's exterior-only highlight were poorly visible; the accepted fixture changes the semantic profile edge and displays the inherited leaf region without changing the camera to conceal the problem. No cyber-android geometry or reference data changed.

## Checks actually run

- `npm run doctor` — Three.js r186, Chromium 144.0.7559.96, WebGL2, SwiftShader.
- `node --test tests/profile-sweep.test.js tests/face-regions.test.js tests/surface-thickness.test.js tests/triangle-spatial-index.test.js` — **28/28 passed**.
- `node --test --test-name-pattern='profile-region-study' tests/models.test.js` — **1/1 passed** for recipe metadata/default geometry/determinism/limits.
- `npm run build` — passed with **26 recipes**.
- `npm run study -- studies/profile-regions.json renders/run18-profile-regions` — passed, **3 cases / 36 locked-camera renders**; manifest retains `visualAcceptance: "not-assessed"`. Final rendered reports contain **3,236 triangles** combined, **2,016** organic-only, and **1,220** mechanical-only. All three exported GLBs validate with **0 errors / 0 warnings**.
- A repository-wide `npm test` attempt reached test **89 with no failures** before the bounded 210-second timeout; this is **not** a full-suite pass.

## Visual assessment

The organic material view separates the green shell, cyan construction ridge, gold normalized-path tip and coral inherited rim, while wire/side views confirm actual thick generated topology. The mechanical view shows a cyan service flank following one authored profile edge across the curved middle guide span, a pink root mount zone, and the structural terminal cap/connector. The selections follow their curved construction rather than appearing as flat screen-space overlays.

## Limits and next workflow target

This is constructor-local face-domain metadata, not persistent parametric CAD history. Rebuilding a sweep regenerates the semantic regions exactly, but arbitrary later booleans/remeshing still require explicit provenance or correspondence. Closed profile holes remain unsupported, and authoring regions are not exported as glTF semantics.

The next general workflow priority is **owned geometry composition/merge with semantic provenance**: combine independently authored parts while preserving named face regions and stable source-part identity without abusing material groups. That would make multi-component props and environment pieces remain queryable after composition.

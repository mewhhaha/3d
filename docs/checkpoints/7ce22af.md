# Sparse free-form deformation lattice checkpoint

Date: 2026-09-17
Implementation revision: `7ce22af4cf0d312304400543bc0f75404d9e3fbd`
Base revision: `8252cee32700157142b83668097417b05501a56b`

## Reusable capability

Added a compact regular free-form deformation (FFD) lattice to the ordinary indexed `BufferGeometry` deformation pipeline. `deformationLattice()` stores a geometry-local handle, X/Z box ranges, bounded 2..8 control-point resolution, and only sparse edited control-point offsets. `latticeVertices()` composes that construction data with the existing independent point-selection layer. `deformGeometry()` evaluates a trivariate Bernstein displacement field inside the authored box while retaining topology, UVs, ordinary custom attributes, topology-valid face regions, and the existing pre-rig ownership contract.

The undeformed regular cage stays implicit, avoiding a giant repeated coordinate table in recipes. Points outside the cage are identity in v1. The evaluated mesh, not a runtime lattice modifier, is what render/export receives.

## Research and implementation decision

- Thomas W. Sederberg and Scott R. Parry, “Free-Form Deformation of Solid Geometric Models”, SIGGRAPH 1986, https://doi.org/10.1145/15922.15903. Observation used: the original FFD represents a space warp with a trivariate tensor-product Bernstein basis over a control lattice. Adaptation: regular handle-local cage plus sparse offset edits; no claim of the paper's arbitrary parallelepiped, extended FFD, inverse fitting, derivative stitching, exact volume preservation, or analytic normal transformation.
- Blender 4.5 LTS manual, Lattice / Lattice Modifier, https://docs.blender.org/manual/en/4.5/animation/lattice.html and https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/lattice.html. Observation used: lattice cage data is independent from dense object topology and modifier influence can be constrained separately. Adaptation: reuse repository point selections rather than introducing a new vertex-group system; export the evaluated ordinary geometry rather than a Blender-compatible lattice datablock.

Detailed bounded notes are in `docs/research/free-form-deformation.md`; API contract and limits are in `docs/geometry-lattice.md`.

## Distinct examples

`models/geometry-lattice-study.js` uses the same API on two materially different forms:

- Organic: a closed creature shoulder mass uses a 3x3x3 cage with seven sparse edits for a broad asymmetric bulge/droop while its socket and datum stay independently authored.
- Mechanical: a subdivided hard-surface service shell uses a different 3x3x3 cage and seven sparse edits for cant/bulge changes while its mounting foot and pins remain rigid separate parts.

Before this operation, equivalent broad asymmetric changes required chains of local pulls/bends or recipe-specific coordinate loops. The lattice makes the broad deformation itself editable construction data.

## Local checks and render evidence

- `npm run doctor`: passed — Three.js r186; Chromium 144.0.7559.96; WebGL2; SwiftShader.
- Focused deformation/sculpt/curve-frame/face-region/lattice suite: **38/38 passed**.
- Targeted `geometry-lattice-study` model metadata/default-build/determinism/parameter-limit check: **1/1 passed**.
- `npm run build`: passed with **37 recipes**.
- `npm run study -- studies/geometry-lattice.json renders/run30-lattice-final`: passed, **4 cases / 48 locked-camera material, clay, wire, and silhouette renders**; source fingerprint `fcbcc806f8a304124c82ebeeaf651839a9498b983c077c8705d72606a2b051e6` over 174 source files.
- Geometry counts: baseline combined **9,032 triangles / 6,624 vertices**; lattice combined **9,032 / 6,624**; organic **4,524 / 2,513**; mechanical **4,508 / 4,111**.
- All four study GLBs: **0 validation errors / 0 warnings**.
- Baseline→lattice combined silhouette IoU: front **0.9075351312**, three-quarter **0.9343181029**, side **0.9526417152**. These are evidence of broad bounded primary-form changes, not an aesthetic or likeness score.
- Actual inspection: the organic three-quarter wire view shows the original sphere tessellation warped into the asymmetric mass; the mechanical three-quarter wire view shows the shell canted/bulged while the rigid mounting foot stays separate; combined clay shows no obvious catastrophic self-intersection. `visualAcceptance` remains `not-assessed` because these are workflow fixtures, not finished assets.
- A bounded repository-wide `npm test` attempt reached test **122 with no failures** before timeout; this is not recorded as a complete full-suite pass.

## Rejected / bounded alternatives

Did not encode a full regular cage coordinate table, chain radial pulls, or introduce a Blender/GPU/runtime dependency. Did not extrapolate the deformation outside the authored box in v1 because that can create surprising remote motion; outside remains explicit identity. Interpolation modes, cage visualization, collision/self-intersection handling, exact volume preservation, arbitrary cages and rig/morph refit remain out of scope.

## CI / blockers

At checkpoint creation the implementation SHA had triggered the existing local-studio, Pages, and offline-authoring-kit workflows; they were still running. Local validation above is independent from those CI statuses. No implementation blocker remains.

## Next workflow priority

Evaluate a shared deformation-field application for multiple separately owned component geometries in one assembly-local frame. This would let a broad cage edit reshape a shell, trim, and related layered parts together while preserving their independent materials/export ownership, instead of forcing authors to merge them before FFD or duplicate lattice coordinates per component.

No cyber-android likeness or reference annotation changed in this checkpoint.

# Mesh relaxation without one-way shrinkage

Accessed: 2026-09-17. Repository dependency checked locally: Three.js r186.

## Gabriel Taubin — *Curve and Surface Smoothing without Shrinkage* (ICCV 1995)

Source: https://research.ibm.com/publications/curve-and-surface-smoothing-without-shrinkage

Original paper mirror used for the algorithm description: https://graphics.stanford.edu/courses/cs468-01-fall/Papers/taubin-smoothing.pdf

- Publication date: 1995-06-20 (IBM Research record).
- Observation: ordinary positive Laplacian/Gaussian smoothing shrinks a mesh. Taubin describes a low-pass fairing filter made from two consecutive smoothing steps: a positive factor `lambda`, followed by a negative factor `mu`, with `0 < lambda < -mu`, repeated. The paper explicitly permits simple equal one-ring weights as a bounded choice while discussing more general filters.
- Intended repository operation: add a topology-preserving `relaxVertices()` brush operation beside the existing one-way `smoothVertices()`. Keep the selection mask, topology, attribute ownership, boundary pinning and normal/tangent rebuild contracts unchanged; only the displacement schedule changes.
- Adaptation: v1 uses the repository's existing uniform one-ring average, defaults to `lambda: 0.5`, `mu: -0.53`, and applies the positive/negative passes sequentially for each iteration. It validates the sign relation instead of exposing arbitrary unstable pairs.
- Test/example: a deterministic noisy indexed sphere is smoothed to comparable radial-noise standard deviation using plain smoothing and the alternating operation; a subdivided open service panel exercises the same operation through a named face region with its boundary pinned.
- Result: on the synthetic sphere fixture used during this pass, baseline mean radius `1.0017415` / radial std `0.066516`; six one-way smooth passes produce mean `0.9770515` / std `0.044485`; ten relaxation iterations produce mean `1.0032991` / std `0.044504`. Thus the comparison is about retained form, not speed: the relaxation uses more passes to reach similar cleanup in this fixture.
- Limitation: this is not a verbatim implementation of Taubin's full signal-processing design, not a cotangent/Laplace-Beltrami operator, and not a mathematical volume guarantee. Uniform one-ring weights remain sensitive to valence and tessellation, and a negative pass can overshoot if used aggressively.

## Blender Manual — Laplacian Smooth Modifier

Source: https://docs.blender.org/manual/en/5.3/modeling/modifiers/deform/laplacian_smooth.html

- Observation: Blender documents shrinkage as a known consequence of Laplacian smoothing and exposes a separate Preserve Volume option plus vertex-group influence controls.
- Intended repository operation: preserve the existing `smoothVertices()` semantics for deliberate one-way fairing, and add a distinct shrink-resistant operation rather than silently changing old recipes. Continue to compose the operation with the repository's independent point masks and named-region selection.
- Test/example: the mechanical fixture applies relaxation only to `panel.service` and an intersected radial falloff, while open frame/boundary geometry remains fixed.
- Limitation: `relaxVertices()` does not reproduce Blender's modifier, its axis controls, normalized mode, or volume-preservation implementation.

## Three.js — `BufferGeometry`

Source: https://threejs.org/docs/#api/en/core/BufferGeometry

- Observation: indexed `BufferGeometry` shares vertices through an index; position changes require dependent normals/bounds to be updated, while clone ownership keeps the input independently editable.
- Intended repository operation: keep relaxation inside the existing `sculptGeometry()` clone-and-edit path, so index topology, UVs, named face-region metadata and ordinary attributes remain owned by the output while normals/bounds (and tangents when present) are rebuilt.
- Test/example: regression tests verify topology preservation and boundary behavior on indexed geometry; the workflow study exports the relaxed fixtures through the ordinary GLB path.
- Limitation: preserving index topology does not make rig weights or morph deltas semantically correct after rest-position edits; those inputs remain rejected by the pre-rig sculpt stage.

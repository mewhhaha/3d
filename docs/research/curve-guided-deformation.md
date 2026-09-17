# Research notes — curve-guided broad deformation

Accessed 2026-09-17. These notes document the design evidence for curve-guided deformation of existing indexed geometry; they do not copy tutorial assets or substantial source text.

## Blender Manual — Curve Modifier

Source: https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/curve.html · Blender 4.5 LTS manual, accessed 2026-09-17.

Observation: Blender describes a mesh traversing a curve according to one dominant deformation axis. Motion perpendicular to that axis controls offset from the curve; geometry beyond the curve ends continues using the endpoint direction vector. For 3D curves, authored tilt and radius can additionally control twist and size.

Repository adaptation: keep the existing `deformationHandle()` local +Y axis and map that bounded axial coordinate to an authored centerline while transporting the source X/Z cross-section. Endpoint tangent continuation is explicit. Selection remains a separate point-domain input. This is not a clone of Blender's modifier: there is no object dependency, arbitrary +/- axis switch, per-control-point radius/tilt, or global-space placement rule.

Test/example: a straight +Y guide is tested as an identity transform; an S-guide is tested for endpoint mapping, cross-section radius preservation and tangent continuation beyond the handle. The rendered organic appendage demonstrates non-circular primary flow.

Result/limitations: the mesh can be rerouted by editing a short centerline instead of stacking several bend handles. Guide length can stretch/compress axial spacing because v1 maps the handle range to normalized arc length rather than solving a length-preserving material model.

## Andrew J. Hanson and Hui Ma — “Parallel Transport Approach to Curve Framing”

Source: Andrew J. Hanson and Hui Ma, Indiana University Computer Science Department technical report, 1995; accessible abstract/transcription indexed from the original Indiana University report. Search record: https://www.yumpu.com/en/document/view/10072875/parallel-transport-approach-to-curve-framing-1-indiana-university · original report identified as Indiana University Technical Report 425, 1995.

Observation: Hanson and Ma motivate parallel-transport moving frames for ribbons, tubes and camera orientations because the familiar Frenet frame can become ambiguous or change orientation abruptly where curvature vanishes. The frame should vary smoothly with the curve instead of depending on a nonzero curvature normal.

Repository adaptation: reuse the already-tested `transportedFrames()` implementation in `src/lib/curve-frame.js` rather than introducing a second framing algorithm inside deformation code. The deformation guide only supplies the centerline and initial cross-section orientation; rotation-minimizing transport carries that orientation through inflections. We do not claim the repository's finite sampled implementation is a symbolic or exact realization of every construction in the report.

Test/example: existing curve-frame tests verify orthonormal transported frames through an inflected route. The new curve-deformation test carries a transverse 0.2 m offset through an S-curve and checks that its distance from the centerline remains within a small numerical tolerance.

Result/limitations: low-curvature and inflection regions avoid the obvious Frenet-normal dependency, but frame quality is still limited by finite curve/frame sampling and input guide quality.

## Three.js r186 — Curve and CatmullRomCurve3

Sources: https://threejs.org/docs/pages/Curve.html and https://threejs.org/docs/pages/CatmullRomCurve3.html · accessed 2026-09-17. Repository dependency is locked to Three.js `0.186.0`.

Observation: `Curve.getPointAt()` and `getTangentAt()` use arc-length-aware parameters, while `CatmullRomCurve3` exposes centripetal/chordal/catmullrom interpolation and tension. The docs identify centripetal as the default curve type.

Repository adaptation: `deformationCurve()` stores only JSON-safe point/configuration data. At evaluation time it constructs a locked-version Three.js curve, refreshes its arc-length cache, and asks the shared transported-frame layer for equal-distance samples. Two-point guides use `LineCurve3`; longer guides use `CatmullRomCurve3`. This keeps Three.js runtime objects out of authored construction data and allows recipes/tests to serialize the guide intent.

Test/example: construction-data tests round-trip the guide through JSON and reject duplicate consecutive control points, unsupported curve types, invalid tension/resolution and a zero initial up vector.

Result/limitations: a compact editable polyline becomes a smooth runtime guide without a new dependency. The current API intentionally offers one spline family rather than a universal curve graph or interactive control-point editor.

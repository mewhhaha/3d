# Cross-section planes without extra tessellation

`sectionLoft()` in `src/lib/forms/structure.js` now accepts two optional functions
of normalized longitudinal position: `squareness(v)` and `depthBias(v)`.
Existing calls still evaluate exactly the same ellipses.

```js
const support = sectionLoft({
  from: 0, to: .8, breadth: () => .16, depth: () => .10,
  squareness: () => .26,
  depthBias: contour([[0, 0], [.35, -.15], [1, 0]]),
});
```

With angle `a = 2πu`, `s = sin(a)`, `c = cos(a)`, the normalized section is
`[s*(1+q*c*c), c*(1+q*s*s+b*c)]`. This smooth periodic polynomial flattens the
principal planes without power-function cusps. Positive bias deepens +Z and
shallows -Z; negative bias does the opposite. Bias is not an object translation.
`q` is in `[0,.45]`, `b` in `[-.45,.45]`, and `q+abs(b) <= .45` is required
at every sample, keeping this deliberately bounded family away from folded
principal profiles. These bounds do not guarantee an arbitrary radial mass
field or offset curve is free of intersections. Inputs must be functions;
invalid samples throw rather than clamping the authored design.

Shape profiles, radial masses, pose, tessellation, UV/detail and materials stay
separate. Re-evaluate geometry after changing the support; existing mesh UVs,
weights, or high/low correspondence are not magically refitted or transferred.
This change does not alter topology within a fixed tessellation. Fresh geometry
recomputes geometric normals; old tangent-space bakes must be regenerated for
changed primary supports. This pass does not change or rebake the head/hair.

## Exercised uses

- `structuredTorsoSupport()` makes the rib cage narrower toward the neck,
  raises the broad iliac region, and separates posterior pelvic depth from
  anterior rib depth. Existing armor and ports sample that same support.
- `studies/section-housing.js` shapes an unrelated flattened mechanical housing
  with an asymmetrically deeper rear compartment. Same resolution, different
  cross-section intent; the inspection port attaches to the changed surface.

Use `massStyle: 'structured'` in the articulated `cyber-form-study` or
`prism-body` study. Limb supports use the previous `sculpted` construction;
this variant changes torso/shoulder shapes, not limb lengths or pose. The
previous defaults remain available. `node scripts/review-primary.mjs` produces
locked material/clay/wire/silhouette comparisons and validated exports.

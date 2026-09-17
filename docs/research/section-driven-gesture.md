# Section-driven gesture — source notes

Accessed 2026-09-17. Written passages only; no videos or tutorial assets consumed.
Direct page opens returned 402 in this environment. The substantive official
written passages were available in indexed search results; no access restriction
was bypassed. These notes describe that content, not unseen instructional video.

- Blender Manual 3.6, **Bendy Bones**:
  https://docs.blender.org/manual/en/3.6/animation/armatures/bones/properties/bendy_bones.html
  Documents sectioned bending/roll, endpoint handles and independently controlled
  curvature/roll/scale; it specifically names spine columns as a use case.
  Adaptation: a smaller build-time field of section translations/orientations,
  shared by sampled supports and explicit rigid sockets. Our interpolation is
  smoothstep plus quaternion slerp, NOT Blender's Bezier/B-Bone skinning method.
  Test/example: known section pivots, shortest rotation across +/-170 degrees,
  rigid terminal continuation, and matching duct sleeve/flange transforms.

- Julien Kaspar, Blender Studio, **6 — Pose Polishing**:
  https://studio.blender.org/training/stylized-character-workflow/5d66533123bda402f76bd3f7/
  The written note separates an overall armature/limb-rotation shape from adjustment
  shapes repairing volume and expression. Adaptation: keep `gestureStyle` (connected
  roots + re-solved limbs) independent from `jointStyle` (socket/clevis geometry),
  and keep both independent from existing head/hair and limb-shell variants.
  Test/example: pose-only hero compared separately from pose plus housings; old
  defaults and their strong regression tests are unchanged.

Result: the first hip-shift trial made the far knee splay excessively; rejected.
A smaller pelvic turn and larger waist offset were retained after real renders.
The field improves editability and the rib/waist transition, not recovered anatomy
or automatic likeness. Mechanical tests, original-image assessment and deployment
remain distinct. Final evidence/commands are in the gesture checkpoint.

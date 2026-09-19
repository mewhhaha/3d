# Shoulder-girdle construction and boundary spans

Accessed 2026-09-19. Stan Prokopenko, **Anatomy of the Shoulder Bones**:
https://www.proko.com/course-lesson/anatomy-of-the-shoulder-bones

Read the public written Lesson Notes, not the video/premium downloads. The
clavicle wraps the neck base, the scapular blade follows the posterior ribs,
and the acromion sits over the humeral socket. This motivated connected front
and rear structures instead of an isolated ball and cowl. Robot proportions
remain an artistic interpretation; no anatomical asset was copied.

Blender Manual, **Bridge Edge Loops**:
https://docs.blender.org/manual/en/5.2/modeling/meshes/editing/edge/bridge_edge_loops.html

The accessible written documentation distinguishes bridging, merging and vertex
correspondence/twist. Our adaptation keeps explicit edge correspondence and
builds a cubic-Hermite *support*, separate from tessellation and thickness. It is
not Blender's operator, automatic retopology or topology welding.

Tests: exact sampled endpoints/derivatives, periodic duct normals, invalid input,
posed shoulder contacts, shared torso/collar edge, independent geometry, UVs and
unchanged head/limb/hand/foot frames. Examples: shoulder assembly and unrelated
angled oval-to-round duct. Render results, rejected incomplete collar and limits:
`docs/checkpoints/2026-09-19-prism-girdle.md`.

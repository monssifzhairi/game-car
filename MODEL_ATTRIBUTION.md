# BMW model: inspection and attribution

## Source asset (unchanged)

- **Repository path:** `3d/bmw.glb` (`3d` is a directory, not an extensionless model).
- **Format:** binary glTF / GLB **2.0**, verified from the `glTF` magic, version, and binary chunk headers.
- **Exact size:** 15,329,648 bytes.
- **Title in embedded metadata:** “[FREE] BMW M3 E30”.
- **Author:** [Martin Trafas / Bexxie](https://sketchfab.com/Bexxie).
- **Source:** [BMW M3 E30 on Sketchfab](https://sketchfab.com/3d-models/free-bmw-m3-e30-ac3c7013434e403e8faff87948caf422).
- **License declared in embedded metadata:** [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
- **Generator:** glTF-Transform v4.4.2.

The author/source/license are also retained in the original GLB. Model credit is linked in the garage. BMW names/logos belong to their respective owners; this integration is not an official BMW product or endorsement.

Other supplied files (`3d/mrc140.glb`, `3d/supra.glb`) were inventoried but not modified, substituted for the BMW, or added to the game. The remaining existing garage vehicles remain procedural.

## Dependencies and hierarchy

All **20 PNG images are embedded** in bufferViews (18 at 1024×1024; two palette images at 32×4). No image or buffer has an external URI. There are no missing `.bin`, texture, animation, or skeleton files to find.

- 10 meshes/nodes; 10 original materials; **71,421 triangles**.
- No skins, bones, or animation clips.
- `KHR_mesh_quantization` is the only required extension; Three.js GLTFLoader supports it directly. No Draco/Meshopt decoder, CDN, or format conversion is needed.
- Additional supported material extensions: clearcoat, emissive strength, transmission.
- Relevant observed material/node pairs:
  - Paint: `Object_4` / `BMW_E30_M3_PAINT`.
  - Rims: `Object_15` / `BMW_E30_M3_RIM`.
  - Tires: `Object_17` / `BMW_E30_M3_TIRE`.
  - Brake discs: `Object_19` / `Brake_Disc`.
  - Calipers: `Object_21` / `Brembo_Calipers`.
  - Lamp lenses: `Object_13` / `BMW_E30_M3_LENS`.

The author/exporter merged all four wheels by material. There are no four wheel nodes to animate directly. Each of the four wheel-material meshes contains four spatially disconnected clusters. `prepareBMW()` splits their existing triangles/attributes into four assemblies using their actual vertex locations, preserving all triangles, normals and UVs. Calipers steer without spinning; rims, tires and discs rotate. The source’s approximately -0.501 radian front-wheel pose is neutralized around the measured tire centres before the driving controller supplies steering. No wheel geometry is invented or replaced.

## Integration changes

The original binary and embedded textures are **unchanged**. Runtime changes are:

1. Clone the scene, clone only the adjustable paint/lens materials, and share the loaded textures and static geometry through the GLTF cache.
2. Expand quantized wheel attributes to floating point before reparenting/transforms; applying world coordinates to normalized int16 buffers directly would corrupt the vertices.
3. Reparent the original wheel triangles under four steering/rolling pivots.
4. Uniformly normalize to 4.55 game metres long; centre laterally/longitudinally; place the lowest tire vertex at road height. The original unposed model is approximately 4.362 m long, 1.351 m tall; the supplied posed front wheels extend its original precise width to approximately 1.870 m.
5. Rotate the source **+Z front** by PI to face the game’s **-Z driving direction**. Menu/garage presentation rotations are separate from that alignment.
6. Preserve original red paint (`#b81a1a` in sRGB), textures, UVs, glass, trim, badges and material settings. Garage paint choices affect only the named paint material, never the whole model.
7. Keep the existing arcade controller, suspension/roll, drift, crash reactions, chase camera and pooled nitro/smoke effects. The BMW has an explicit collision footprint in vehicle configuration. Its `apex` save ID is retained so existing saves/unlocks are compatible; its displayed name is now **BMW M3 E30**. Existing performance stats are arcade tuning, not a claim of factory BMW specifications.
8. High graphics preserves the original lamp-lens transmission. Performance mode disables only that transmission pass, retaining the lens geometry, maps, opacity and other material properties. No texture downsampling or mesh simplification is applied.
9. Vite imports the actual source using `../../3d/bmw.glb?url` and emits a content-hashed GLB into `dist/assets/`. It does not depend on a development-only `/3d/` path or copy the other large models into production.

A model-specific loading overlay blocks invisible driving until preparation completes. Model failures show a retry UI that reloads the original GLB, not a primitive-car fallback. Sessions/countdowns are held while the BMW is unavailable. Geometry created for wheel pivots and cloned materials are disposed when the BMW unmounts; cached source assets are not disposed accidentally.

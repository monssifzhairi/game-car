# Imported model and photographic texture inspection

The supplied **`3d` directory** contains three real **GLB 2.0** files, verified by binary headers and JSON chunks. Their original files are unchanged. All images and buffers are embedded; no missing external textures or `.bin` files exist.

## BMW M3 E30 — `3d/bmw.glb`

- Author: [Martin Trafas / Bexxie](https://sketchfab.com/Bexxie).
- [Source](https://sketchfab.com/3d-models/free-bmw-m3-e30-ac3c7013434e403e8faff87948caf422); embedded license **CC BY 4.0**.
- 10 mesh nodes, 10 materials, 20 embedded PNGs, 71,421 triangles. Required source extension: `KHR_mesh_quantization`; no skins or animation clips.
- Source front is +Z. The runtime clone is centered, placed at tire height, scaled uniformly to 4.55 game metres, and rotated PI to face the -Z driving direction.
- Wheel triangles are merged by material: `Object_15/BMW_E30_M3_RIM`, `Object_17/BMW_E30_M3_TIRE`, `Object_19/Brake_Disc`, `Object_21/Brembo_Calipers`. They were inspected and recovered into four pivots from their disconnected spatial clusters. The authored front-wheel pose is neutralized. Calipers steer without spinning; tires, rims and discs rotate.
- Paint material `BMW_E30_M3_PAINT` retains factory sRGB red `#b81a1a`. Other materials/UVs are retained. Only that paint material responds to finishes. High preserves the original `BMW_E30_M3_LENS` transmission; Performance skips its extra refraction pass.

## Mercedes S-Class W140 — `3d/mrc140.glb`

- Author: [Black Snow](https://sketchfab.com/BlackSnow02).
- [Source](https://sketchfab.com/3d-models/mersedes-benz-s-class-w140-ad9650076f4c491eb90d65ccb1378b9a); embedded license **CC BY 4.0**.
- Three material-merged meshes, three palette materials, two embedded palette textures, 223,405 original triangles. Required source extension: `KHR_mesh_quantization`.
- Source axis corrections are retained; actual front was visually confirmed at +Z. Runtime is normalized to 5.05 metres and aligned to -Z.
- Original silver palette finish/interior are retained. Wheels are merged into body meshes, with no separate wheel material or rig. The model is fully drivable, but those wheels are not falsely animated or replaced.
- Runtime copy: 181,582 triangles, after conservative border-locked simplification with error limited to 0.03% of mesh radius.

## Toyota Supra — `3d/supra.glb`

- Supplied by the repository owner. The GLB contains no embedded creator/license attribution; verify permission before redistribution if not already held. This project does not invent a license for it.
- 18 meshes, 22 nodes, 18 materials, five embedded PNGs, 29,980 triangles. 20 transform animation clips exist; they are not wheel-driving clips and are omitted only from the optimized runtime copy.
- Original root corrects Z-up to Y-up. Front +Z was confirmed from the visible car and front-light positions. Runtime length is 4.65 metres, with ground/center corrections and -Z forward.
- Inspected wheel materials: `rubber.002`, `wheel_metal.001`, `brake_disc`, `brake_disc1`. Their original geometry is reconstructed into four steering/rolling assemblies. `carpaint` retains factory red and supports finishes.

## Optimized delivery

`public/models/*.glb` are derived deployable copies. Original source files remain intact. The reproducible optimizer (`scripts/optimize-models.mjs`) applies WebP encoding, deduplication/welding and Meshopt compression; BMW/Supra triangle counts remain unchanged. Normal and packed data textures use lossless WebP. Color textures use quality 94. Meshopt decoder code is included locally in the browser bundle, not loaded from a third-party CDN.

Textures and static geometry are cached/shared. Per-instance paint/lens materials and reconstructed wheel geometry are disposed on unmount without destroying cached originals. Loading now uses explicit streamed bytes and deadlines rather than relying on Drei's completed-item counter.

## Photographic PBR textures and sky

Provider: **ambientCG**, **CC0 1.0**. Assets: [Asphalt019](https://ambientcg.com/view?id=Asphalt019), [Concrete031](https://ambientcg.com/view?id=Concrete031), [Facade014](https://ambientcg.com/view?id=Facade014), [SkyOnlyHDRI017](https://ambientcg.com/view?id=SkyOnlyHDRI017).

Source mirror: [Malcolm Nixon / DarkCity](https://github.com/Malcolmnixon/DarkCity/tree/main/assets/ambientcg.com). Images were resized/converted to WebP for browser delivery and the sky color-graded. The original photographic maps, not generated mock textures, are used for the road, concrete, facade and sky. `scripts/prepare-textures.mjs` reproduces them.

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)

Credits are also linked from Settings (`public/credits.txt`) and the garage. Brand names/logos belong to their respective owners; no official manufacturer affiliation is claimed. Performance statistics are arcade tuning, not factory specifications.

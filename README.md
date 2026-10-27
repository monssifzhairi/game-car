# LUXURY DRIVE 3D

**Own the road. Feel the power.** Playable browser arcade driving, built with React 19, TypeScript, Vite, Three.js / React Three Fiber, Drei and Zustand.

## This release

- **All three actual supplied models** are free and drivable: BMW M3 E30, Mercedes S-Class W140 and Toyota Supra. They appear in the menu and garage, not just a static showcase. Three existing fictional cars remain unlockable.
- **Photographic PBR materials**: asphalt color/normal/roughness, concrete, building facade color/emission/normal, and a photographic panoramic sky. Material files are local, not fetched from a CDN at runtime.
- Tiered instanced architecture, upgraded vegetation, Jersey barriers/reflectors, damp-looking road shading, environment reflections and directional shadows.
- **Faster entry**: a 95 km/h rolling start and optional 140 km/h auto-cruise. Keyboard/touch throttle, brake, drift and nitro still work independently. The starter pickup line is immediately reachable.
- **Streamed model loading** shows actual downloaded MB/bytes. Downloads time out at 60 seconds; decoding at 30 seconds; renderer preparation at 25 seconds. There is explicit retry, Performance-mode retry, and access to another vehicle—not an indefinite “0/1 assets” screen or a primitive fallback.
- Adaptive resolution on High, a lightweight Performance preset, and a measured FPS readout. FPS is not fabricated or guaranteed across devices.

## Run and build

Node **22.12+** required (Node 22 or 24 recommended).

```sh
npm ci
npm run dev                       # live preview, port 5173; binds 0.0.0.0
npm run build                     # deploy dist/ to Vercel or any static host
npm test                          # 33 simulation, model, storage and loader tests
npm run test:imports              # Chromium three-car gameplay, dev server running
npm exec vite preview -- --host 0.0.0.0 --port 5174
npm run test:bmw:production        # production mobile/multi-touch tests on port 5174
```

`test:browser` and `test:bmw` are compatible aliases for the consolidated three-car suite. The test browser is distributed through npm; a separate browser download is not required. Screenshots live in ignored `.playwright/`. `TEST_URL` and `PRODUCTION_URL` override the test servers.

Vite automatically copies `public/models/`, `public/textures/` and `public/credits.txt` into `dist/`. Model requests use the configured Vite base URL. Do not deploy only the source HTML or omit `public/` during a build. There are no externally hosted WASM/model/texture dependencies.

## Controls

| Input | Action |
| --- | --- |
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A D / ← → | Steer |
| Space + steering | Controlled drift |
| Shift | Nitro |
| Escape / P | Pause / resume |
| R | Restart after game over |

Touch buttons use independent captured pointers for simultaneous steering/pedals; release, cancellation or loss of focus clears inputs. Auto-cruise can be disabled in Settings. Pausing freezes distance, scoring, simulation and wheel rotation. Countdown/crash presentation timers use elapsed time so low FPS does not stretch the countdown into a long wait.

Gold tokens award $10; emerald bonuses $50. Clean near misses/overtakes, high-speed driving, drifting and the 1 km challenge award points/cash. The garage retains purchases and finishes. Top-five runs, best score/distance, wallet, selected vehicle, unlocks and preferences persist locally. The three supplied vehicles are added to older saves without erasing progression.

## Asset pipeline and performance

Original `3d/*.glb` files are unchanged. Deployable copies are in `public/models/`:

| Vehicle | Original bytes | Runtime bytes | Runtime triangles |
| --- | ---: | ---: | ---: |
| BMW | 15,329,648 | 7,030,004 | 71,421 |
| Mercedes | 10,159,880 | 1,812,884 | 181,582 |
| Supra | 3,148,492 | 1,988,768 | 29,980 |

Combined model downloads are reduced from **28.6 MB to 10.8 MB**. Only the selected model is fetched; parsed models are cached for garage reuse. BMW/Supra triangle counts are unchanged. Mercedes uses conservative border-locked simplification with a 0.03% error limit. WebP texture encoding and Meshopt compression supply most of the reduction. The Meshopt decoder is bundled locally with the application.

Regenerate assets with `npm run optimize:models`. `npm run prepare:textures` regenerates photographic WebP textures from the credited GitHub mirror (requires `gh` access). Optional build tools are dev dependencies, not browser dependencies.

High preserves transmissive materials, facade normals and larger shadows; DPR starts capped at 1.35 and can fall to 0.8 if measured FPS is low. Performance uses 0.85 DPR, smaller shadows and fewer expensive material effects. Repeated scenery is instanced, entity pools are bounded, and no full-screen SSR/real-time mirror reflections are used.

## Architecture

- `game/modelLoader.ts`: byte-streamed fetch, deadlines, validation, local decoder, request deduplication and parsed cache.
- `game/ImportedCar.tsx`: universal imported model renderer, original finishes, animation, load/error/retry UI.
- `game/bmwModel.ts`, `game/importedRig.ts`: source-inspected geometry, normalization and wheel assembly reconstruction.
- `game/World.tsx`: photographic PBR scene, reusable textures and instanced/recycled scenery.
- `game/RenderQuality.tsx`: measured FPS and adaptive DPR.
- `game/engine.ts`: arcade movement, swept/AABB collision checks, traffic/tokens/particles, scoring.
- `game/GameScene.tsx`: session render loop, camera, scene synchronization and phase transitions.
- `store/`, `components/`, `data/`, `utils/`: UI snapshots, responsive menus/controls, vehicle tuning and validated persistence.

## Honest scope

This is a visually improved **arcade highway game**, not a full tire/rigid-body simulator or an AAA photorealistic open world. The expressway is straight and endless; lighting is a fixed after-rain dusk. Traffic remains lightweight procedural geometry. BMW and Supra have reconstructed animated wheels. The Mercedes source merges wheels into body/palette meshes; its wheels remain authored static geometry rather than rotating invented/cut body pieces. Mercedes palette paint is intentionally preserved and not falsely offered as independently recolorable paint.

Performance depends on real hardware; sandbox Chromium uses much slower software rendering. See `TESTING.md` for executed checks. See `MODEL_ATTRIBUTION.md` and deployed `credits.txt` for credits and the missing Supra license metadata caveat before public redistribution.

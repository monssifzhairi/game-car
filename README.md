# LUXURY DRIVE 3D

**Own the road. Feel the power.** An original browser-based arcade driving game built with React 19, TypeScript, Vite, Three.js / React Three Fiber, Drei, and Zustand. All vehicle geometry, scenery, textures, and synthesized sound are generated in the app; there are no remote asset dependencies or licensed brand models.

## Run

Requires Node.js **22.12+** (Node 22 or 24 recommended).

```sh
npm install
npm run dev          # http://localhost:5173
npm run build        # deploy the dist/ directory to any static host
npm test             # simulation and storage tests
npm run test:browser # Chromium integration tests, with the dev server running
```

The dev server binds to `0.0.0.0` and accepts preview hostnames. The browser suite uses an npm-distributed headless Chromium, so no browser download is necessary. `TEST_URL` overrides the desktop test origin; `PLAYWRIGHT_EXECUTABLE_PATH` can supply another Chromium executable. Test screenshots are written to the ignored `.playwright/` directory.

## Play

| Input | Action |
| --- | --- |
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A D / ← → | Steer |
| Space + steering | Controlled drift |
| Shift | Nitro |
| Escape / P | Pause / resume |
| R | Restart after game over |

Mobile has independent captured-pointer steering, gas, brake, drift, and nitro buttons. Hold several controls at once. Releasing/cancelling a touch clears its input. Losing browser focus pauses the drive and releases all controls.

Automatic cruising is on by default: the car gradually holds 112 km/h unless you brake or accelerate. Turn it off in Settings for manual throttle control.

### The drive

- A four-lane, endless, sunset expressway with a procedural illuminated city, landscaping, streetlights, overhead signs, and periodic overpasses.
- Six original fictional cars: **Apex GT, Sovereign, Veloce S, Crest R, Spectre V12, Atlas SV**. Stats alter acceleration, top speed, steering, braking, and nitro duration.
- Traffic sedans, SUVs, vans, sports cars, and trucks, with varied speeds and spawn spacing.
- Gold cash tokens ($10), emerald bonuses ($50), overtakes, safe near misses, sustained drifts, high-speed points, and a 1 km challenge ($200).
- Finite nitro; recharge by driving, drifting, and collecting tokens. Safe near misses award extra recharge.
- Barrier/minor impacts damage the car, slow it down, and grant a recovery window. Hard traffic impacts deal more damage. At zero condition, a crash sequence leads to results and instant restart.
- A functioning garage with vehicle unlocks, purchasable finishes, specification comparisons, and preview rotation.
- A persistent top-five **local** leaderboard, best score/distance, wallet, unlocked cars, purchased finishes, vehicle selection, and sound/graphics/cruise settings. Saves are validated, and unavailable or malformed localStorage fails safely.
- Procedural engine, tire, boost, pickup, UI, and impact sounds, initialized after user interaction.

### Architecture

- `src/game/engine.ts`: delta-based arcade simulation, swept longitudinal/AABB collisions, traffic/token recycling, fixed particle pool, rewards. Deliberately no heavyweight rigid-body vehicle solver.
- `src/game/GameScene.tsx`: render loop, chase camera, game phases and visual synchronization.
- `src/game/Car.tsx`, `World.tsx`: original procedural geometry, instanced scenery, shared generated textures, environment lighting.
- `src/game/AudioManager.ts`: Web Audio synthesis.
- `src/store/gameStore.ts`: explicit session phases, UI snapshots (~10 Hz), persistence and economy.
- `src/components/`: menus, garage, HUD, result screens, settings, records, touch and keyboard controls.
- `src/data/vehicles.ts`: configurable vehicle stats, prices and finishes.
- `src/utils/storage.ts`: save validation and safe I/O.

Road geometry is fixed while markings and scenery recycle relative to travel distance. Traffic (16), collectibles (24), and particles (96) are bounded pools. The camera and simulation run outside React state. DPR is capped; Performance mode reduces resolution, antialiasing and shadow cost. No costly full-scene postprocessing or per-frame cube reflections.

### Scope

This release prioritizes the complete driving loop on one polished, straight expressway. Steering/drifting are free lateral arcade movement, not a full tire simulation. The dusk lighting is intentionally fixed; there is no weather cycle, branching road network, online ranking, licensed-brand content, or full rigid-body crash deformation. Performance depends on device/GPU; a universal 60 FPS claim has not been made.

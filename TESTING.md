# Verification — 27 October 2026

## Executed

- `npm run build`: TypeScript check and production Vite build passed.
- `npm test`: **14 tests passed** (10 simulation, 4 persistence/validation).
- `npm run test:browser`: **passed** against a running Vite server in real headless Chromium, with WebGL via software rendering. Desktop viewport: 960×640; mobile viewport: 390×844, with touch enabled.
- `npm audit`: no known dependency vulnerabilities at verification time.

### Browser coverage

- Main menu, settings, WebGL canvas creation.
- Actual countdown into gameplay.
- Keyboard acceleration and steering input; distance and score accumulation.
- Holding Shift consumes nitro.
- Pause freezes scoring/distance; resume continues the run.
- Driving into barriers causes actual repeated impacts, recovery windows, zero-condition crash, results, and saved run.
- R starts a new run without refreshing the page and clears run progress.
- Browser reload preserves the high score.
- Local records dialog works.
- Garage switches preview; unaffordable vehicles cannot be purchased.
- Purchase, vehicle unlock, paint purchase, preview rotation, and driving a newly purchased car. Test currency was seeded only for the garage purchase checks, not gameplay/collision tests.
- Real multi-touch events via Chromium CDP hold steering and gas concurrently; release/cancel clears the inputs.
- Mobile controls are visible; no document-width overflow.
- No uncaught page errors during the tested flows.

### Simulation coverage

Acceleration/braking, steering stabilization, nitro/recharge, token one-shot collection, safe near misses versus collisions, impact recovery and fatal damage, bounded entity pools, drift rewards, swept high-speed collision detection, and all six vehicle configurations.

### Persistence coverage

Missing/malformed storage, invalid fields and locked selections, round-trip progression/cosmetics, top-five truncation, disabled storage.

## Limits

These tests establish functional behavior, not a universal frame-rate target. The sandbox browser uses software rendering and is much slower than GPU-accelerated desktop hardware. Visual screenshots were inspected at desktop and mobile sizes; physical-device testing, iOS Safari, and long-duration GPU profiling have not been performed. Final visual-only refinements (mobile chase-camera framing, drift icon, car proportions) were followed by a fresh production build and unit-test run.


## Actual BMW integration — current branch

Executed after integrating the uploaded asset:

- `npm run build`: passed; emits `dist/assets/bmw-<hash>.glb` from the actual `3d/bmw.glb`.
- `npm test`: **19 passed**, including five tests against the actual GLB’s geometry, header, embedded dependencies, wheel structure, original materials, alignment and triangle preservation.
- `npm run test:bmw`: **passed** in real Chromium/WebGL. The running Fiber scene was inspected directly: `BMW_M3_E30`, source `3d/bmw.glb`, 71,421 triangles, 20 decoded texture resources, and four wheel assemblies.
- BMW browser checks passed for garage rotation, paint changes and original red restore; acceleration, lateral movement, wheel spin/front steering, -Z orientation/road height, drift, nitro/exhaust, pause (including wheel freeze), actual barrier damage/game over, and restart.
- A deliberately aborted GLB request showed the explicit original-model error UI. Retrying with the network restored loaded the same actual BMW successfully; no primitive fallback was used.
- `npm run test:bmw:production`: **passed** against `vite preview` on port 5174, at a 390×844 touch-enabled mobile viewport. Confirmed the browser requested the content-hashed GLB and the server’s deployed GLB is byte-identical (SHA-256) to `3d/bmw.glb`. Real simultaneous gas/steering touches, mobile nitro, touch cancellation, pause and no horizontal overflow passed.
- No uncaught runtime errors in normal BMW gameplay, and no browser/WebGL errors in the production-mobile flow. The intentionally simulated failed request is expected to produce a caught loader error.
- Desktop driving/menu and production-mobile screenshots were captured and visually inspected. Browser integration tests used Performance quality with software WebGL; the original source model was also rendered separately with its full transmission materials during inspection. These checks are not hardware FPS certification or physical iOS/Android testing.

The previous generic game verification above documents the earlier release; the BMW-specific suites are the browser suites re-executed for this integration.

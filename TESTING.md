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

# Verification — 27 October 2026

## Current three-car / PBR release

### Build and automated tests

- `npm run build`: TypeScript and production Vite build passed.
- `npm test`: **33 passed** across five suites.
- `npm audit`: no known dependency vulnerabilities at verification time.

Coverage:
- 10 arcade simulation checks: throttle/brake, steering stabilization, nitro/recharge, cash collection, safe near misses versus hits, recovery/fatal damage, bounded pools, drift, swept collisions and all vehicle tuning.
- 5 persistence checks: missing/malformed/disabled storage, validated fields, top-five run retention and migration of the three free imported vehicles without losing older saves.
- 5 raw BMW checks: actual GLB 2 header/dependencies/license metadata, original triangles, reconstructed wheel structure, material isolation, model size/orientation and invalid-model rejection.
- 7 runtime model checks: all three optimized GLBs parsed with the local Meshopt decoder, expected triangles, width/length/ground alignment, original wheel assemblies, and download-size reductions. BMW/Supra keep original triangle counts; Mercedes remains above 170k triangles after conservative simplification.
- 6 loader checks: deployment-safe paths, actual byte tracking, concurrent request deduplication/cache, HTTP error handling, rejection of an HTML SPA rewrite, 60-second network deadline, 30-second decoding deadline, and retry state reset.

### Real browser tests executed

`npm run test:imports` passed in Chromium/WebGL with an 800×600 desktop viewport:

- Inspected the actual running Fiber scene for **BMW M3 E30**, **Mercedes W140**, and **Toyota Supra**. Source paths, mesh triangles, decoded textures and wheel counts matched the supplied models and optimized manifest.
- For each actual car: garage selection, free Drive button, countdown, acceleration, lateral steering, nitro/exhaust, score/distance and pause.
- BMW/Supra rolling wheel transforms changed while driving. Mercedes explicitly retains its original merged wheels (no fabricated animation).
- Only selected models were downloaded; returning to BMW reused its parsed cache without a second download.
- Actual barrier impacts led to crash/game over, saved results and instant R restart while using the imported Supra.
- A deliberately missing model (HTTP 404) produced the explicit loader error and successful retry of the same optimized BMW after restoring the route.
- No normal-flow uncaught page or browser/WebGL errors.

`npm run test:bmw:production` passed against the built app served by Vite preview on port 5174, at **390×844 with touch enabled**:

- The deployed BMW response matches the optimized artifact by SHA-256.
- BMW and Supra load from `public/models/` deployment paths with local decoding.
- The actual Supra reaches gameplay. Real CDP multi-touch holds gas + steering, then gas + nitro; speed and nitro respond. Touch cancellation, pause and no horizontal document overflow pass.
- No uncaught page or browser/WebGL errors.

Visual screenshots were captured and inspected for the three-model source inspection, the new photographic road/city, Supra garage presentation, and production-mobile driving. Screenshots stay in ignored `.playwright/`.

## What was not verified

- No physical iOS/Android devices or hardware-accelerated GPU frame-rate benchmark were available. Chromium uses software WebGL in this sandbox and is substantially slower than a gaming GPU. There is **no universal 60 FPS claim**.
- Browser gameplay checks use Performance quality to keep software rendering practical. A separate 960×640 High-preset Chromium smoke check rendered photographic materials, environment reflections, 2048 shadows and the original BMW transmission without browser/WebGL errors; its screenshot was inspected. Sustained High-preset hardware profiling remains to be done.
- The public Vercel domain is not updated by editing this branch. The new build must be merged/deployed before production users receive these fixes.
- The Supra file lacks creator/license metadata. Runtime correctness does not establish redistribution rights; see credits.

## Reproduce

```sh
npm ci
npm test
npm run build
# Terminal A
npm run dev
# Terminal B
npm run test:imports
# Production verification
npm exec vite preview -- --host 0.0.0.0 --port 5174
npm run test:bmw:production
```

`test:browser` and `test:bmw` remain compatible entry points for the consolidated imported-car suite. Tests use npm-distributed Chromium, not a CDN browser download.

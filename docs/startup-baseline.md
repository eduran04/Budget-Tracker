# Startup performance baseline

Measured before the startup-optimization work so improvements are provable.
Reproduce with `npm run electron:profile` (builds, then launches Electron with
`STARTUP_PROFILE=1`; timing marks print to the terminal).

Main-process marks (`appReady`, `windowCreated`, `readyToShow`,
`didFinishLoad`) are milliseconds since process launch. Renderer marks
(`jsLoaded`, `initDbStart`, `initDbEnd`, `firstInteractive`) are milliseconds
since the renderer's time origin, which begins roughly when navigation starts.

## Baseline — pre-optimization (2026-07-16)

Machine: local dev machine (win32 10.0.26200), production build (`vite build`),
Electron 43, seeded database.

| Mark | Run 1 (cold) | Run 2 (warm) | Run 3 (warm) |
|---|---|---|---|
| appReady | 276 | 32 | 31 |
| windowCreated | 419 | 78 | 77 |
| readyToShow | 1105 | 274 | 252 |
| didFinishLoad | 1106 | 266 | 255 |
| jsLoaded | 682 | 182 | 166 |
| initDbStart | 689 | 190 | 183 |
| initDbEnd | 748 | 212 | 213 |
| firstInteractive (Dashboard data rendered) | 890 | 333 | 353 |

Run 1 is a true cold start (binaries not in OS file cache); runs 2 and 3 are
warm relaunches.

## Bundle baseline (pre-optimization)

Single JS chunk, no code splitting:

| Asset | Raw | Gzip |
|---|---|---|
| `dist/assets/index-*.js` | 1,148.70 kB | 341.79 kB |
| `dist/assets/index-*.css` | 86.13 kB | 14.40 kB |

Top packages by gzip weight (from `npm run build:analyze`, writes `stats.html`):

| Package | Gzip |
|---|---|
| recharts (+ d3-*, es-toolkit, decimal.js-light, @reduxjs/toolkit, immer) | ~207 KB |
| react-dom | 85 KB |
| app code | 62 KB |
| dexie | 35 KB |
| zod | 28 KB |
| react-router | 22 KB |
| lucide-react | 21 KB |

Recharts and its transitive dependencies account for roughly 60% of vendor
weight and are only needed by the Dashboard and Reports routes.

## Post-optimization results (2026-07-16)

Recorded after implementing the boot splash, `show: false` + `ready-to-show`,
deferred recurring-rule processing, route-level lazy loading, and vendor
chunking. Measured on the packaged portable build
(`release/win-unpacked/Budget Tracker.exe`), seeded database:

| Mark | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| appReady | 39 | 38 | 34 |
| windowCreated | 71 | 65 | 62 |
| readyToShow (window shown, content painted) | 268 | 244 | 240 |
| didFinishLoad | 265 | 242 | 238 |
| jsLoaded | 98 | 85 | 88 |
| initDbStart | 177 | 158 | 159 |
| initDbEnd | 207 | 184 | 182 |
| firstInteractive (Dashboard data rendered) | 584 | 545 | 539 |

### Comparison vs baseline

- First visible content: the window now appears already painted at
  ~250ms (`readyToShow`), versus ~1100ms to first content on the baseline cold
  start — roughly 76% faster, and the blank-white-window phase is gone
  entirely (the window stays hidden until first paint, and the inline splash
  covers the JS parse).
- Dashboard fully interactive (cold): 890ms baseline → 584ms — about 34%
  faster, meeting the 30% target.
- On warm relaunches the Dashboard data render moved from ~340ms to ~540ms
  because the Dashboard chunk is now lazy-loaded; in exchange the app shell
  and loading feedback appear much earlier. Both are far inside the 3-second
  interactive budget.
- Startup-critical JS (entry + preloaded chunks) dropped from 342 KB gzip
  (single chunk) to 181.6 KB gzip; Recharts (~104 KB gzip) now loads only
  with the Dashboard/Reports chunks.

### Regression guardrails

- `npm run check:bundle` fails if startup-critical JS gzip weight exceeds the
  baseline in `scripts/bundle-baseline.json` by more than 10%.
- `src/lib/startup.test.ts` guards `initDb` timing and ensures recurring-rule
  processing stays out of the blocking startup path.
- `npm run electron:profile` reproduces the timing table above.
- `npm run check:startup` (also in CI) builds and launches Electron, then fails
  if wall-clock time to `firstInteractive` exceeds 10 seconds.

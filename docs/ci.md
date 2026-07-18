# Continuous integration

Every push runs the **CI** workflow (`.github/workflows/ci.yml`):

1. Install dependencies (`npm ci`, with npm cache)
2. Lint (`npm run lint` — ESLint)
3. Typecheck (`npm run typecheck` — `tsc -b`)
4. Test (`npm test` — Vitest)
5. Startup budget — production build + Electron launch; fails if wall-clock time to `firstInteractive` exceeds **10 seconds** (`npm run check:startup`, via `xvfb-run` on Linux). On CI only, the Chromium sandbox is disabled (`ELECTRON_DISABLE_SANDBOX=1`) because GitHub Actions runners cannot configure the SUID sandbox helper; local `npm run check:startup` keeps the sandbox enabled.

The job name shown in GitHub status checks is **Lint and Test**.

Run the same checks locally before pushing:

```bash
npm run ci
npm run check:startup   # builds, then launches Electron and exits
```

### TypeScript 6 / 7 side-by-side

The project compiles with **TypeScript 7** (`@typescript/native` → `tsc`). The `typescript` package is aliased to `@typescript/typescript6` so `typescript-eslint` can use the TypeScript 6 programmatic API (TS 7 does not ship one yet). Do not replace the `typescript` alias with `typescript@7` until typescript-eslint supports it.

## Branch protection on `main`

Pipeline must pass. After the workflow has run at least once on `main` or a PR targeting `main`:

1. Open **Settings → Branches → Add branch ruleset** (or classic **Add rule**) for `main`
2. Enable **Require status checks to pass before merging**
3. Add the required check: **Lint and Test**
4. Recommended: **Require a pull request before merging**
5. Optional: **Require approvals** — if enabled, merge stays blocked until both review approval and CI pass

There is no `develop` branch today. If one is added later, apply the same ruleset to it.

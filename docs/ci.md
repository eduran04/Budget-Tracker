# Continuous integration

Every push and pull request runs the **CI** workflow (`.github/workflows/ci.yml`):

1. Install dependencies (`npm ci`, with npm cache)
2. Lint (`npm run lint` — ESLint)
3. Typecheck (`npm run typecheck` — `tsc -b`)
4. Test (`npm test` — Vitest)

The job name shown in GitHub status checks is **Lint and Test**.

Run the same checks locally before pushing:

```bash
npm run ci
```

### TypeScript 6 / 7 side-by-side

The project compiles with **TypeScript 7** (`@typescript/native` → `tsc`). The `typescript` package is aliased to `@typescript/typescript6` so `typescript-eslint` can use the TypeScript 6 programmatic API (TS 7 does not ship one yet). Do not replace the `typescript` alias with `typescript@7` until typescript-eslint supports it.

## Branch protection on `main`

Branch protection is configured in the GitHub repo settings (not in the workflow file). After the workflow has run at least once on `main` or a PR targeting `main`:

1. Open **Settings → Branches → Add branch ruleset** (or classic **Add rule**) for `main`
2. Enable **Require status checks to pass before merging**
3. Add the required check: **Lint and Test**
4. Recommended: **Require a pull request before merging**
5. Optional: **Require approvals** — if enabled, merge stays blocked until both review approval and CI pass

There is no `develop` branch today. If one is added later, apply the same ruleset to it.

### Optional: apply via `gh` (repo admin)

```bash
# Requires admin rights. Adjust as needed for your org's ruleset API.
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["Lint and Test"]}' \
  -F enforce_admins=false \
  -F required_pull_request_reviews='{"required_approving_review_count":0}' \
  -F restrictions= \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

Prefer the GitHub UI if the classic protection API is unavailable (rulesets-only orgs).

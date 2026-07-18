// Bundle size gate: fails if the gzip weight of startup-critical JS (the
// chunks loaded before any route renders) exceeds the recorded baseline by
// more than 10%. Run `npm run build` first, then `npm run check:bundle`.
// After an intentional size change, update scripts/bundle-baseline.json.
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distAssets = path.join(root, "dist", "assets");
const baselinePath = path.join(root, "scripts", "bundle-baseline.json");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

// Startup-critical chunks are the entry plus everything it modulepreloads.
const html = readFileSync(path.join(root, "dist", "index.html"), "utf8");
const critical = [...html.matchAll(/assets\/([\w.-]+\.js)/g)].map((m) => m[1]);
if (critical.length === 0) {
  console.error("No JS chunks referenced from dist/index.html — did the build run?");
  process.exit(1);
}

const gzipSize = (file) =>
  gzipSync(readFileSync(path.join(distAssets, file))).length;

const criticalGzip = critical.reduce((sum, f) => sum + gzipSize(f), 0);
const totalGzip = readdirSync(distAssets)
  .filter((f) => f.endsWith(".js"))
  .reduce((sum, f) => sum + gzipSize(f), 0);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const limit = baseline.criticalGzipBytes * (1 + baseline.tolerance);

console.log(`Startup-critical JS (gzip): ${kb(criticalGzip)} across ${critical.length} chunks`);
console.log(`Total JS (gzip):            ${kb(totalGzip)}`);
console.log(`Baseline:                   ${kb(baseline.criticalGzipBytes)} (+${baseline.tolerance * 100}% => limit ${kb(limit)})`);

if (criticalGzip > limit) {
  console.error(
    `\nFAIL: startup-critical JS exceeds the baseline limit. ` +
      `If this increase is intentional, update scripts/bundle-baseline.json.`,
  );
  process.exit(1);
}
console.log("\nOK: bundle size within budget.");

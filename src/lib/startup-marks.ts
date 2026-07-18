/**
 * Lightweight startup instrumentation. Marks are recorded with the
 * Performance API and echoed to the console (picked up by the Electron main
 * process when profiling) so cold-start phases can be measured over time.
 */
const logged = new Set<string>();

export function markStartup(label: string) {
  if (logged.has(label)) return;
  logged.add(label);
  performance.mark(`startup:${label}`);
  console.log(`[startup] ${label}: +${Math.round(performance.now())}ms`);
}

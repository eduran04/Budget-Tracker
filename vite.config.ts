import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import type { PluginOption } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative paths so the packaged Electron app can load assets from disk
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    // npm run build:analyze — writes stats.html with a bundle treemap
    process.env.ANALYZE === "1" &&
      (visualizer({ filename: "stats.html", gzipSize: true }) as PluginOption),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Stable vendor chunks that cache independently of app code. Recharts
        // is intentionally not grouped: with lazy routes it lands in a chunk
        // loaded only when Dashboard/Reports render.
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
            },
            {
              name: "vendor-ui",
              test: /node_modules[\\/](radix-ui|@radix-ui|lucide-react)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/**/*.test.ts",
        "src/lib/seed.ts",
        "src/lib/startup-marks.ts",
        "src/lib/utils.ts",
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});

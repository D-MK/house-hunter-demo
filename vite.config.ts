import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

// Fully static: no dev proxy, no API target, no env vars. Everything this app
// needs is bundled at build time, so nothing host-specific is ever compiled in.
//
// `base` is the GitHub Pages project sub-path (https://<user>.github.io/house-hunter-demo/).
// Assets are emitted relative to it; leaving it at '/' would 404 every asset on Pages.
export default defineConfig({
  base: "/house-hunter-demo/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(here, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // The lib tests are plain functions and would run happily in Node; the
  // component tests need a DOM. `environmentMatchGlob` is gone in Vitest 4, so
  // jsdom is the default and the cheap tests just pay for a document they don't
  // use — a couple of hundred milliseconds across the whole suite.
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

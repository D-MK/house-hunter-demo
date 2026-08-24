import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
});

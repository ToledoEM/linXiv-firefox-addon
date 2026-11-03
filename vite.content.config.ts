import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

// scripting.executeScript takes one file, so the injected script can't share
// chunks with the popup. Built after vite.config.ts, into the same dist.
export default defineConfig({
  root,
  publicDir: false,

  build: {
    outDir: resolve(root, "dist"),
    emptyOutDir: false,

    rollupOptions: {
      input: resolve(root, "src/content.ts"),
      output: {
        format: "iife",
        entryFileNames: "assets/content.js",
        footer: "globalThis.__linxivExtract();",
      },
    },
  },
});

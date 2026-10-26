import { defineConfig } from "vite";
import { resolve } from "node:path";

// Same headers as public/_headers, so dev/preview behave like Cloudflare Pages.
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export default defineConfig({
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
  worker: { format: "es" },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        garmentcode: resolve(import.meta.dirname, "garmentcode.html"),
      },
    },
  },
});

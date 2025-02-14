import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["brotli-wasm", "brotli-wasm/pkg.bundler/brotli_wasm_bg.wasm"],
  },
  plugins: [react(), topLevelAwait()],
});

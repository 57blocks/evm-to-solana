import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      buffer: "buffer/",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  server: {
    host: true, // Listen on all network interfaces (0.0.0.0)
    proxy: {
      // Proxy Jito tip_floor API to avoid CORS issues
      "/api/v1/bundles/tip_floor": {
        target: "https://bundles.jito.wtf",
        changeOrigin: true,
      },
    },
  },
});

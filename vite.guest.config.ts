import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, "index.html"),
        guest: path.resolve(__dirname, "guest.html"),
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  server: { host: "0.0.0.0", port: 5173 },
});

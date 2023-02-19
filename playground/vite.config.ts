import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    proxy: {
      "/api": "https://app.affine.pro"
    }
  }
});

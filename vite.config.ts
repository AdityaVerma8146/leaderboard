import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/scores": "http://localhost:3000",
    },
  },
});

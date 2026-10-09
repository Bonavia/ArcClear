import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env=loadEnv(mode, process.cwd(), "");
  const apiTarget=`http://127.0.0.1:${process.env.API_PORT || process.env.PORT || env.API_PORT || env.PORT || 8787}`;
  return {
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    open: true,
    proxy: { "/api": apiTarget },
  },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true, proxy: { "/api": apiTarget } },
};
});

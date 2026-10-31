import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// CSP is injected at build time only: Vite's dev server needs inline scripts for HMR.
const csp = {
  name: "inject-csp",
  apply: "build",
  transformIndexHtml: () => [{
    tag: "meta", injectTo: "head-prepend",
    attrs: {
      "http-equiv": "Content-Security-Policy",
      content: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    },
  }],
};

export default defineConfig({
  plugins: [react(), csp],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => proxyReq.removeHeader("origin"));
        },
      },
    },
  },
  build: { sourcemap: false },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // GitHub's trending page has no API and blocks browser CORS —
      // proxy it through the dev server. (In production, replicate with
      // a serverless rewrite, e.g. Vercel/Netlify.)
      "/gh-trending": {
        target: "https://github.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gh-trending/, "/trending"),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    },
  },
});

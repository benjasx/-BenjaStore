import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    !process.env.VITEST &&
      VitePWA({
        registerType: "prompt",
        includeAssets: ["favicon.svg", "logo_solo.jpeg", "logo_letras.jpeg"],
        manifest: {
          name: "Doble Tentación",
          short_name: "Doble Tentación",
          description: "Punto de venta para restaurante",
          lang: "es",
          start_url: "/",
          display: "standalone",
          theme_color: "#17110f",
          background_color: "#17110f",
          icons: [
            { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,jpeg,png}"],
          globIgnores: ["**/{pdfmake,vfs_fonts,exceljs}*.js"],
          navigateFallback: "/index.html",
          runtimeCaching: [
            {
              urlPattern: /\/assets\/(pdfmake|vfs_fonts|exceljs)[^/]*\.js$/,
              handler: "CacheFirst",
              options: { cacheName: "export-libs" },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts-styles" },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-files",
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
              },
            },
          ],
        },
      }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "firebase", test: /node_modules[/\\](@?firebase)[/\\]/ },
          ],
        },
      },
    },
  },
  test: {
    alias: {
      "virtual:pwa-register/react": fileURLToPath(
        new URL("./src/test/pwa-register.ts", import.meta.url),
      ),
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});

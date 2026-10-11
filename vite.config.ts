// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        outDir: "dist/client",
        devOptions: { enabled: false },
        manifest: {
          id: "/",
          name: "CropCare — AI Crop Disease Detection",
          short_name: "CropCare",
          lang: "en",
          scope: "/",
          orientation: "portrait",
          categories: ["agriculture", "productivity", "utilities"],
          description:
            "Diagnose crop diseases from a leaf photo, with offline access to the disease database, tips, seasons and quizzes.",
          theme_color: "#143a26",
          background_color: "#143a26",
          display: "standalone",
          start_url: "/dashboard",
          shortcuts: [
            {
              name: "Scan a leaf",
              short_name: "Scan",
              url: "/app",
              icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
            },
            {
              name: "Disease database",
              short_name: "Diseases",
              url: "/diseases",
              icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
            },
            {
              name: "Weather risk",
              short_name: "Weather",
              url: "/weather",
              icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
            },
          ],
          icons: [
            { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,woff2,png,svg,ico}"],
          navigateFallback: undefined,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigationPreload: true,
          runtimeCaching: [
            {
              // HTML navigations: always try the network first, fall back to cache offline.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                !url.pathname.startsWith("/~oauth") &&
                !url.pathname.startsWith("/api"),
              handler: "NetworkFirst",
              options: {
                cacheName: "html-navigations",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Hashed, same-origin build assets.
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin &&
                (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_build/")),
              handler: "CacheFirst",
              options: {
                cacheName: "build-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.gstatic.com" ||
                url.origin === "https://fonts.googleapis.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts" },
            },
          ],
        },
      }),
    ],
  },
});

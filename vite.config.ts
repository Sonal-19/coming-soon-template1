import { defineConfig } from "vite";

// Default public URL for the share preview / canonical link. Override it with
// VITE_SITE_URL in .env (see .env.example).
process.env.VITE_SITE_URL ??= "https://genxmeta.io";

// Page media lives in ./assets and is referenced from index.html with relative
// paths, so Vite copies only the files the page actually uses into dist/
// (with content hashes for cache busting). Videos are never inlined.
export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    assetsDir: "static",
    assetsInlineLimit: 4096,
    target: "es2020",
  },
});

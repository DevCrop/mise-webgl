import { defineConfig } from "vite";

export default defineConfig({
  base: "/build/",
  publicDir: false,
  server: {
    cors: {
      origin: "http://localhost:8080",
    },
    origin: "http://localhost:5173",
  },
  build: {
    target: "es2020",
    manifest: true,
    outDir: "public/build",
    emptyOutDir: true,
    sourcemap: false,
    reportCompressedSize: true,
    rolldownOptions: {
      input: "resources/ts/app.ts",
      output: {
        codeSplitting: {
          groups: [
            { name: "vendor-three", test: /[\\/]node_modules[\\/]three[\\/]/ },
            {
              name: "vendor-motion",
              test: /[\\/]node_modules[\\/](?:gsap|lenis)[\\/]/,
            },
            {
              name: "vendor-ui",
              test: /[\\/]node_modules[\\/](?:swiper|@barba)[\\/]/,
            },
          ],
        },
      },
    },
  },
});

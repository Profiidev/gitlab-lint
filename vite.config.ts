import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "gitlab-lint",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: [],
    },
    minify: true,
    ssr: true,
  },
  ssr: {
    noExternal: true,
  },
});

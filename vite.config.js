import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootFile = name => fileURLToPath(new URL(`./${name}`, import.meta.url));

const copyProductImages = {
  name: "copy-lamseti-product-images",
  apply: "build",
  closeBundle() {
    mkdirSync(rootFile("./dist/"), { recursive: true });
    ["app.js", "config.js", "pink-notebook.jpg", "blue-notebook.jpg", "collection.jpg", "notebooks-set.jpg"]
      .forEach(name => copyFileSync(rootFile(name), rootFile(`./dist/${name}`)));
  }
};

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [react(), tailwindcss(), copyProductImages],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react-vendor";
          if (id.includes("node_modules/motion")) return "motion-vendor";
          if (id.includes("node_modules/@radix-ui")) return "radix-vendor";
        }
      }
    }
  }
});

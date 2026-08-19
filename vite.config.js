import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative paths mean the build works on GitHub Pages under any repo name,
  // with no config to change if you rename the repo.
  base: "./",
  plugins: [react(), tailwindcss()],
});

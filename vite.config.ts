/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Published as the GitHub Pages project page https://1cto.github.io/minesweeper/.
  base: "/minesweeper/",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});

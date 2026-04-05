import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["./vitest.setup.ts"],
    environment: "node",
    include: [
      "lib/**/*.{test,spec}.ts",
      "app/**/*.{test,spec}.ts",
      "components/**/*.{test,spec}.tsx",
      "worker/**/*.{test,spec}.ts",
    ],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

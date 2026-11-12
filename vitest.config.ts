import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // Test requests must be same-origin with jsdom, independent of the local .env.
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://localhost:8080/api/v1") },
  test: {
    environment: "jsdom",
    // jsdom 30 hace preflight CORS real en XHR: mismo origen que la API de los tests lo evita.
    environmentOptions: { jsdom: { url: "http://localhost:8080" } },
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    exclude: ["node_modules/**", "dist/**", "e2e/**", ".claude/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["src/components/ui/**", "src/test/**", "**/*.d.ts", "e2e/**"],
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 55,
        branches: 55,
      },
    },
  },
});

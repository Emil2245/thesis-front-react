import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    sourcemap: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react-router") || id.includes("/react-dom") || /\/react\//.test(id))
            return "react";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("radix-ui")) return "radix";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("/zod/"))
            return "forms";
        },
      },
    },
  },
});

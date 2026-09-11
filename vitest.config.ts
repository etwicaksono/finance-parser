import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirror the "@/*" path alias from tsconfig.json so tests can import
    // modules that use the alias (e.g. "@/features/...").
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

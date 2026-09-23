import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests for the dependency-free domain libs (lib/*). Path alias
// matches tsconfig's "@/..." so tests can import exactly like app code.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    passWithNoTests: true,
    environment: "node",
  },
});

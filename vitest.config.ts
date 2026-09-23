import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests for the dependency-free domain libs (lib/*) run in node.
// Component render tests (components/**/*.test.tsx) use React Testing
// Library and opt into jsdom per file with a `// @vitest-environment jsdom`
// docblock, so the fast node default stays for everything else. Path
// alias matches tsconfig's "@/..." so tests import exactly like app code.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts", "components/**/*.test.tsx"],
    passWithNoTests: true,
    environment: "node",
  },
});

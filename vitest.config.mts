import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
    // The tests talk to a Neon branch over the internet; from a slow
    // connection, set-up and queries can take several seconds, and many
    // files at once queue for connections. Be patient, and run fewer at once.
    testTimeout: 30000,
    hookTimeout: 60000,
    maxWorkers: 3,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});

import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const dist = resolve("./dist");

// Ensure dist directory exists
if (!existsSync(dist)) {
  mkdirSync(dist);
}

const config = [
  {
    strictDeprecations: true,
    input: "src/index.ts",
    plugins: [typescript(), terser()],
    output: [
      {
        dir: dist,
        format: "es",
        sourcemap: true,
      },
    ],
  },
];

export default config;

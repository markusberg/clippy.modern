import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const name = "clippy";
const dist = resolve("./dist");

// Ensure dist directory exists
if (!existsSync(dist)) {
  mkdirSync(dist);
}

const bundle = {
  strictDeprecations: true,
  input: "src/agent.js",
  plugins: [terser()],
  output: [
    {
      dir: dist,
      format: "es",
      sourcemap: true,
    },
  ],
};

export default bundle;

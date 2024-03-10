import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

const dist = resolve("./dist");

// Ensure dist directory exists
mkdirSync(dist, { recursive: true });

const config = [
	{
		strictDeprecations: true,
		input: "build/index.js",
		plugins: [terser()],
		output: [
			{
				dir: dist,
				format: "es",
				sourcemap: true,
			},
		],
	},
	{
		input: "build/index.js",
		plugins: [dts()],
		output: [
			{
				file: "dist/index.d.ts",
				format: "es",
			},
		],
	},
];

export default config;

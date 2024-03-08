/**
 * Generate agents json payloads in dist-folder
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { AgentType } from "../types.js";

const agents: AgentType[] = [
	"Clippy",
	"Bonzi",
	"F1",
	"Genie",
	"Genius",
	"Links",
	"Merlin",
	"Peedy",
	"Rocky",
	"Rover",
];

const __filename = fileURLToPath(import.meta.url);
const cwd = dirname(__filename);

for (const name of agents) {
	const src = join(cwd, name);
	const dst = join(cwd, "..", "..", "dist", "agents", name);

	mkdirSync(dst, { recursive: true });
	format(src, dst, "agent", "agent");
	format(src, dst, "sounds-mp3", "sound");
	format(src, dst, "sounds-ogg", "sound");
	copyFileSync(
		join(cwd, "..", "..", "src", "agents", name, "map.png"),
		join(dst, "map.png"),
	);
}

/**
 * Convert data structure to JSON, and write to file
 * @param dirSrc source directory
 * @param dirDst destination directory
 * @param file filename
 * @param prop what property of the data structure to convert
 */
async function format(
	dirSrc: string,
	dirDst: string,
	file: string,
	prop: string,
) {
	const filename = join(dirSrc, `${file}.js`);
	const struct = await import(filename);
	const data = JSON.stringify(struct[prop]);
	const outFile = join(dirDst, `${file}.json`);
	writeFileSync(outFile, data);
}

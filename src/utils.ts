import type { Point } from "./types.js";

export type BranchFunction = () => Promise<void>;

export function getOffset(element: HTMLElement): Point {
	const rect = element.getBoundingClientRect();
	const x = rect.left + window.scrollX;
	const y = rect.top + window.scrollY;
	return [x, y];
}

export function sleep(ms = 1000): Promise<void> {
	return new Promise((resolve, _reject) =>
		setTimeout(() => resolve(undefined), ms),
	);
}

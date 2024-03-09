import { Point } from "./types.js";

export function getOffset(element: HTMLElement): Point {
	if (!element.getClientRects().length) {
		return [0, 0];
	}

	const rect = element.getBoundingClientRect();
	const win = element.ownerDocument.defaultView || {
		pageXOffset: 0,
		pageYOffset: 0,
	};
	const x = rect.left + win.pageXOffset;
	const y = rect.top + win.pageYOffset;
	return [x, y];
}

export function getWidth(el: HTMLElement): number {
	const style = window.getComputedStyle(el, null);

	return (
		el.clientWidth -
		parseInt(style.getPropertyValue("padding-left")) -
		parseInt(style.getPropertyValue("padding-right"))
	);
}

export function getHeight(el: HTMLElement): number {
	const style = getComputedStyle(el, null);

	return (
		el.clientHeight -
		parseInt(style.getPropertyValue("padding-top")) -
		parseInt(style.getPropertyValue("padding-bottom"))
	);
}

export function sleep(ms = 1000): Promise<boolean> {
	return new Promise((resolve, _reject) => setTimeout(() => resolve(true), ms));
}

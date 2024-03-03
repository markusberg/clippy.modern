import { AnimatorState } from "./animator.js";

export type Point = [number, number];

/**
 * jquery replacement functions
 */

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

export function getWidth(
  el: HTMLElement,
  type: "inner" | "outer" | "width" | "full"
): number | null {
  if (type === "inner") {
    return el.clientWidth;
  }
  if (type === "outer") {
    return el.offsetWidth;
  }

  const style = window.getComputedStyle(el, null);

  if (type === "width") {
    return (
      el.clientWidth -
      parseInt(style.getPropertyValue("padding-left")) -
      parseInt(style.getPropertyValue("padding-right"))
    );
  }

  if (type === "full") {
    return (
      el.offsetWidth +
      parseInt(style.getPropertyValue("margin-left")) +
      parseInt(style.getPropertyValue("margin-right"))
    );
  }
  return null;
}

export function getHeight(
  el: HTMLElement,
  type: "inner" | "outer" | "height" | "full"
): number | null {
  if (type === "inner") {
    return el.clientHeight;
  }
  if (type === "outer") {
    return el.offsetHeight;
  }

  const style = window.getComputedStyle(el, null);
  if (type === "height") {
    return (
      el.clientHeight -
      parseInt(style.getPropertyValue("padding-top")) -
      parseInt(style.getPropertyValue("padding-bottom"))
    );
  }

  if (type === "full") {
    return (
      el.offsetHeight +
      parseInt(style.getPropertyValue("margin-top")) +
      parseInt(style.getPropertyValue("margin-bottom"))
    );
  }

  return null;
}

export function sleep(ms = 1000): Promise<boolean> {
  return new Promise((resolve, _reject) => setTimeout(() => resolve(true), ms));
}

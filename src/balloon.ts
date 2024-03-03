import { getHeight, getOffset, getWidth, sleep } from "./utils.js";

export type Side = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export class Balloon {
  _balloon: HTMLDivElement;
  _content: HTMLDivElement;

  _isHiding: number | null = null;

  constructor(private _targetEl: HTMLElement) {
    const balloonElement = document.createElement("div");
    balloonElement.className = "clippy-balloon";
    balloonElement.setAttribute("hidden", "true");

    const tipElement = document.createElement("div");
    tipElement.className = "clippy-tip";

    const contentElement = document.createElement("div");
    contentElement.className = "clippy-content";
    balloonElement.appendChild(tipElement);
    balloonElement.appendChild(contentElement);
    this._content = contentElement;

    this._balloon = balloonElement;
    this._targetEl.insertAdjacentElement("afterend", balloonElement);

    document.body.append(this._balloon);
  }

  WORD_SPEAK_TIME = 200;
  CLOSE_BALLOON_DELAY = 2000;

  reposition() {
    const sides: Side[] = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ];

    for (const side of sides) {
      this._position(side);
      if (!this._isOut()) {
        break;
      }
    }
  }

  _BALLOON_MARGIN = 15;

  /***
   *
   * @param side
   * @private
   */
  _position(side: Side) {
    const targetHeight = getHeight(this._targetEl, "height") || 0;
    const targetWidth = getWidth(this._targetEl, "width") || 0;

    const offset = getOffset(this._targetEl);
    const offsetX = offset[0] - window.scrollX;
    const offsetY = offset[1] - window.scrollY;

    const height = getHeight(this._balloon, "outer") || 0;
    const width = getWidth(this._balloon, "outer") || 0;

    this._balloon.classList.remove("clippy-top-left");
    this._balloon.classList.remove("clippy-top-right");
    this._balloon.classList.remove("clippy-bottom-right");
    this._balloon.classList.remove("clippy-bottom-left");

    let left = 0;
    let top = 0;
    switch (side) {
      case "top-left":
        // right side of the balloon next to the right side of the agent
        left = offsetX + targetWidth - width;
        top = offsetY - height - this._BALLOON_MARGIN;
        break;
      case "top-right":
        // left side of the balloon next to the left side of the agent
        left = offsetX;
        top = offsetY - height - this._BALLOON_MARGIN;
        break;
      case "bottom-right":
        // right side of the balloon next to the right side of the agent
        left = offsetX;
        top = offsetY + targetHeight + this._BALLOON_MARGIN;
        break;
      case "bottom-left":
        // left side of the balloon next to the left side of the agent
        left = offsetX + targetWidth - width;
        top = offsetY + targetHeight + this._BALLOON_MARGIN;
        break;
    }

    this._balloon.style.top = `${top}px`;
    this._balloon.style.left = `${left}px`;
    this._balloon.classList.add(`clippy-${side}`);
  }

  _isOut() {
    const height = getHeight(this._balloon, "outer") || 0;
    const width = getWidth(this._balloon, "outer") || 0;

    const vw = document.querySelector("html")?.clientWidth || 0;
    const vh = document.querySelector("html")?.clientHeight || 0;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const offset = getOffset(this._balloon);
    const x = offset[0] - scrollX;
    const y = offset[1] - scrollY;
    const margin = 5;
    if (y - margin < 0 || x - margin < 0) {
      return true;
    }
    if (y + height + margin > vh || x + width + margin > vw) {
      return true;
    }

    return false;
  }

  async speak(text: string, hold: boolean) {
    if (this._isHiding) {
      clearTimeout(this._isHiding);
    }

    const words = text.split(/\s/g);

    this.hidenow();
    this._content.innerHTML = words.join(" ");
    this._content.style.height = "auto";
    this._content.style.width = "15rem";
    this.reposition();

    this._balloon.removeAttribute("hidden");

    for (let idx = 0; idx <= words.length; idx++) {
      this._content.innerHTML = words.slice(0, idx).join(" ");
      await sleep(this.WORD_SPEAK_TIME);
    }

    if (!hold) {
      this.hide();
    }
  }

  hidenow() {
    this._balloon.setAttribute("hidden", "true");
  }

  hide() {
    this._isHiding = window.setTimeout(
      () => this.hidenow(),
      this.CLOSE_BALLOON_DELAY
    );
  }

  destroy() {
    this._balloon.remove();
  }
}

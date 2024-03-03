import { AgentConfig, AgentSound } from "./agents/types.js";
import { Animator } from "./animator.js";
import { Balloon } from "./balloon.js";
import { Point, getHeight, getOffset, getWidth, sleep } from "./utils.js";

export type Direction = "Right" | "Up" | "Left" | "Down" | "Top";

export class Agent {
  _el: HTMLElement;
  _animator: Animator;
  _balloon: Balloon;

  get _hidden() {
    return this._el.getAttribute("hidden") === "true" || false;
  }
  _offset: Point = [0, 0];
  private _targetX?: number;
  private _targetY?: number;
  private _moveHandle?: (e: MouseEvent) => void;
  private _upHandle?: (e: MouseEvent) => void;
  private _dragUpdateLoop?: number;

  constructor(path: string, data: AgentConfig, sounds: AgentSound) {
    const el = document.createElement("div");
    el.className = "clippy";
    el.setAttribute("hidden", "true");
    this._el = el;

    document.body.append(this._el);
    this._animator = new Animator(this._el, path, data, sounds);
    this._balloon = new Balloon(this._el);
    this._setupEvents();
  }

  /***
   *
   * @param {Number} x
   * @param {Number} y
   */
  gestureAt(x: number, y: number) {
    const d = this._getDirection(x, y);
    const gAnim = `Gesture${d}`;
    const lookAnim = `Look${d}`;

    const animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
    return this.play(animation);
  }

  /**
   * Remove the agent, and remove the elements from the dom
   * @returns
   */
  async destroy() {
    this._balloon.destroy();
    await this._animator.exitAnimation();
    await this._animator.showAnimation("Hide");
    this._el.remove();
  }

  async moveTo(x: number, y: number, duration = 1000) {
    const dir = this._getDirection(x, y);
    const anim = `Move${dir}`;

    // the simple case
    if (duration === 0) {
      this._el.style.top = `${y}px`;
      this._el.style.left = `${x}px`;
      this.reposition();
      return;
    }

    // no animations
    if (!this.hasAnimation(anim)) {
      const endHandler = () => {
        this._el.removeEventListener("animationend", endHandler);
      };
      this._el.addEventListener("animationend", endHandler);
      this._el.animate({ top: y, left: x }, { duration, iterations: 1 });
      return;
    }

    const state = await this._animator.showAnimation(anim);
    if (state === "WAITING") {
      const endHandler = async () => {
        this._el.removeEventListener("animationend", endHandler);
        await this._animator.exitAnimation();
      };
      this._el.addEventListener("animationend", endHandler);
      this._el.animate(
        { top: `${y}px`, left: `${x}px` },
        { duration, iterations: 1 }
      );
    }
  }

  async play(name: string, timeout = 3000) {
    try {
      await this._animator.exitAnimation();
      const result = await this._animator.showAnimation(name);
      if (result === "WAITING") {
        await sleep(timeout);
        await this._animator.exitAnimation();
      }
    } catch (err) {
      console.error(err);
    }
  }

  show() {
    this._el.removeAttribute("hidden");

    const cssTop = this._el.style.top;
    const cssLeft = this._el.style.left;

    if (cssTop === "auto" || cssLeft !== "auto") {
      const wW = document.querySelector("html")?.clientWidth || 0;
      const wH = document.querySelector("html")?.clientHeight || 0;
      const left = wW * 0.8;
      const top = (wH + window.scrollX) * 0.8;
      this._el.style.top = `${top}px`;
      this._el.style.left = `${left}px`;
    }

    return this.play("Show");
  }

  async speak(text: string, hold: boolean): Promise<void> {
    await this._balloon.speak(text, hold);
  }

  hasAnimation(name: string) {
    return this._animator.hasAnimation(name);
  }

  /***
   * Gets a list of animation names
   */
  animations() {
    return this._animator.animations();
  }

  /***
   * Play a random animation
   */
  animate() {
    const nonIdle = this.animations().filter(
      (name) => !name.startsWith("Idle")
    );
    const idx = Math.floor(Math.random() * nonIdle.length);
    const anim = nonIdle[idx];
    return this.play(anim);
  }

  /**************************** Utils ************************************/

  /**
   * Get the direction
   * @param x
   * @param y
   * @returns "Right" | "Up" | "Left" | "Down" | "Top"
   */
  _getDirection(x: number, y: number): Direction {
    const offset = getOffset(this._el);
    const height = getHeight(this._el, "height");
    const width = getWidth(this._el, "width");

    if (height !== null && width !== null) {
      const centerX = offset[0] + width / 2;
      const centerY = offset[1] + height / 2;

      const a = centerY - y;
      const b = centerX - x;

      const r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

      // Left and Right are for the character, not the screen :-/
      if (-45 <= r && r < 45) return "Right";
      if (45 <= r && r < 135) return "Up";
      if ((135 <= r && r <= 180) || (-180 <= r && r < -135)) return "Left";
      if (-135 <= r && r < -45) return "Down";
    }

    // sanity check
    return "Top";
  }

  /**************************** Queue and Idle handling ************************************/

  /***
   * Handle empty queue.
   * We need to transition the animation to an idle state
   * @private
   */
  _onQueueEmpty() {
    if (this._hidden || this._isIdleAnimation()) {
      return;
    }
    const idleAnim = this._getIdleAnimation();
    this._animator.showAnimation(idleAnim);
  }

  /**
   * Is the current animation Idle?
   * @returns
   */
  _isIdleAnimation(): boolean {
    const current = this._animator.currentAnimationName;
    return current ? current.startsWith("Idle") : false;
  }

  /**
   * Get a random Idle animation
   */
  _getIdleAnimation() {
    const idleAnimations = this.animations().filter((anim) =>
      anim.includes("Idle")
    );

    const idx = Math.floor(Math.random() * idleAnimations.length);
    return idleAnimations[idx];
  }

  /**************************** Events ************************************/

  _setupEvents() {
    window.addEventListener("resize", () => this.reposition());
    this._el.addEventListener("mousedown", (event) => this._onMouseDown(event));
    this._el.addEventListener("dblclick", () => this._onDoubleClick);
  }

  _onDoubleClick() {
    if (!this.play("ClickedOn")) {
      this.animate();
    }
  }

  reposition() {
    if (!this._hidden) {
      return;
    }
    const eHeight = getHeight(this._el, "outer");
    const eWidth = getWidth(this._el, "outer");
    const vw = document.querySelector("html")?.clientWidth || null;
    const vh = document.querySelector("html")?.clientHeight || null;

    if (vw === null || vh === null || eHeight === null || eWidth === null) {
      console.log("Error Flynn!");
      return;
    }

    const margin = 5;

    const offset = getOffset(this._el);
    let left = offset[0] - window.scrollX;
    let top = offset[1] - window.scrollY;
    if (top - margin < 0) {
      top = margin;
    } else if (top + eHeight + margin > vh) {
      top = vh - eHeight - margin;
    }

    if (left - margin < 0) {
      left = margin;
    } else if (left + eWidth + margin > vw) {
      left = vw - eWidth - margin;
    }

    this._el.style.left = `${left}px`;
    this._el.style.top = `${top}px`;

    // reposition balloon
    this._balloon.reposition();
  }

  _onMouseDown(e: MouseEvent) {
    e.preventDefault();
    this._startDrag(e);
  }

  /**************************** Drag ************************************/

  _startDrag(event: MouseEvent) {
    this._balloon.hidenow();
    this._offset = this._calculateClickOffset(event);

    this._moveHandle = this._dragMove.bind(this);
    this._upHandle = this._finishDrag.bind(this);

    window.addEventListener("mousemove", this._moveHandle);
    window.addEventListener("mouseup", this._upHandle);

    // fixme: use getAnimationFrame
    this._dragUpdateLoop = window.setTimeout(() => this._updateLocation(), 10);
  }

  private _calculateClickOffset(e: MouseEvent): Point {
    const mouseX = e.pageX;
    const mouseY = e.pageY;
    const offset = getOffset(this._el);
    return [mouseX - offset[0], mouseY - offset[1]];
  }

  private _updateLocation() {
    this._el.style.top = `${this._targetY || 0}px`;
    this._el.style.left = `${this._targetX || 0}px`;
    this._dragUpdateLoop = window.setTimeout(() => this._updateLocation(), 10);
  }

  _dragMove(e: MouseEvent) {
    e.preventDefault();
    const x = e.clientX - this._offset[0];
    const y = e.clientY - this._offset[1];
    this._targetX = x;
    this._targetY = y;
  }

  _finishDrag() {
    window.clearTimeout(this._dragUpdateLoop);
    // remove handles
    if (this._moveHandle) {
      window.removeEventListener("mousemove", this._moveHandle);
    }
    if (this._upHandle) {
      window.removeEventListener("mouseup", this._upHandle);
    }
    // resume animations
    this.reposition();
  }
}

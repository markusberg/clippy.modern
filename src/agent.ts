import { Animator } from "./animator.js";
import { Balloon } from "./balloon.js";
import { AgentConfig, AgentSound, Point } from "./types.js";
import { getHeight, getOffset, getWidth, sleep } from "./utils.js";

export type Direction = "Right" | "Up" | "Left" | "Down" | "Top";

export class Agent {
	_el: HTMLElement;
	_animator: Animator;
	_balloon: Balloon;

	get isVisible() {
		return this._el.style.visibility === "visible";
	}

	_offset: Point = [0, 0];
	private _targetX?: number;
	private _targetY?: number;
	private _moveHandle?: (e: MouseEvent) => void;
	private _upHandle?: (e: MouseEvent) => void;
	private _dragUpdateLoop?: number;

	constructor(path: string, data: AgentConfig, sounds: AgentSound) {
		this._el = document.createElement("div");
		this._el.className = "clippy";
		this._el.style.visibility = "hidden";

		document.body.append(this._el);
		this._animator = new Animator(this._el, path, data, sounds);
		this._balloon = new Balloon(this._el);
		this._setupEvents();
	}

	/**
	 * Gesture at the specified coordinates
	 * @param coord
	 * @returns
	 */
	gestureAt(coord: Point) {
		const d = this._getDirection(coord);
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

	/**
	 * Move the agent to the specified coordinates
	 * @param coord
	 * @param duration The amount of time that the agent is traveling, excluding start and stop animations
	 * @returns
	 */
	async moveTo(coord: Point, duration = 1000) {
		const dir = this._getDirection(coord);
		const anim = `Move${dir}`;

		// the simple case
		if (duration === 0) {
			this._el.style.top = `${coord[1]}px`;
			this._el.style.left = `${coord[0]}px`;
			this.reposition();
			return;
		}

		const state = await this._animator.showAnimation(anim);

		this._el.animate(
			{ top: coord[1], left: coord[0] },
			{ duration, iterations: 1 },
		);

		if (state === "WAITING") {
			await sleep(duration);
			await this._animator.exitAnimation();
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
		this._el.style.visibility = "visible";

		const winWidth = window.innerWidth;
		const winHeight = window.innerHeight;
		const agentWidth = this._el.offsetWidth;
		const agentHeight = this._el.offsetHeight;

		// place agent in bottom right corner
		this._el.style.top = `calc(${winHeight - agentHeight}px - 3rem)`;
		this._el.style.left = `calc(${winWidth - agentWidth}px - 3rem`;

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
			(name) => !name.startsWith("Idle"),
		);
		const idx = Math.floor(Math.random() * nonIdle.length);
		const anim = nonIdle[idx];
		return this.play(anim);
	}

	/**************************** Utils ************************************/

	/**
	 * Get the direction
	 * @param coord
	 * @returns "Right" | "Up" | "Left" | "Down" | "Top"
	 */
	_getDirection(coord: Point): Direction {
		const offset = getOffset(this._el);
		const height = getHeight(this._el);
		const width = getWidth(this._el);

		const centerX = offset[0] + width / 2;
		const centerY = offset[1] + height / 2;

		const a = centerY - coord[1];
		const b = centerX - coord[0];

		const r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

		// Left and Right are for the character, not the screen :-/
		if (-45 <= r && r < 45) return "Right";
		if (45 <= r && r < 135) return "Up";
		if ((135 <= r && r <= 180) || (-180 <= r && r < -135)) return "Left";
		if (-135 <= r && r < -45) return "Down";

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
		if (!this.isVisible || this._isIdleAnimation()) {
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
			anim.includes("Idle"),
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
		if (!this.isVisible) {
			return;
		}
		const eHeight = this._el.offsetHeight;
		const eWidth = this._el.offsetWidth;
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		const margin = 5;

		let y = this._el.offsetTop - window.scrollY;
		if (y <= margin) {
			y = margin;
		} else if (y + eHeight + margin > windowHeight) {
			y = windowHeight - eHeight - margin;
		}

		let x = this._el.offsetLeft - window.scrollX;
		if (x <= margin) {
			x = margin;
		} else if (x + eWidth + margin > windowWidth) {
			x = windowWidth - eWidth - margin;
		}

		this._el.style.left = `${x}px`;
		this._el.style.top = `${y}px`;

		// reposition balloon
		this._balloon.reposition();
	}

	_onMouseDown(e: MouseEvent) {
		e.preventDefault();
		this._startDrag(e);
	}

	/**************************** Drag ************************************/

	_startDrag(event: MouseEvent) {
		console.log("start drag");
		// this._balloon.hidenow();
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
		console.log("update location");
		this._el.style.top = `${this._targetY || 0}px`;
		this._el.style.left = `${this._targetX || 0}px`;
		this._balloon.reposition();
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

import { Animator } from "./animator.js";
import { Balloon } from "./balloon.js";
import type { AgentConfig, AgentSound, Point } from "./types.js";
import { type BranchFunction, getOffset, sleep } from "./utils.js";

export type Direction = "Right" | "Up" | "Left" | "Down" | "Top";

// dummy dnd image 1x1 transparent pixel
const imgDnd = new Image(1, 1);
imgDnd.src =
	"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export class Agent {
	private el: HTMLElement;
	private animator: Animator;
	private balloon: Balloon;
	private clickOffset: Point | null = null;

	get isVisible() {
		return this.el.style.visibility === "visible";
	}

	constructor(path: string, data: AgentConfig, sounds: AgentSound) {
		this.el = document.createElement("div");
		this.el.id = "clippy";
		this.el.className = "clippy";
		this.el.style.visibility = "hidden";

		document.body.append(this.el);
		this.animator = new Animator(this.el, path, data, sounds);
		this.balloon = new Balloon(this.el);

		// setup events
		window.addEventListener("resize", () => this.reposition());
		this.el.addEventListener("dblclick", () => this.onDoubleClick());
		this.el.setAttribute("draggable", "true");
		this.el.addEventListener("dragstart", (ev) => this.dragStart(ev));
		document.addEventListener("dragover", (ev) => this.drag(ev));
	}

	/**
	 * Gesture at the specified coordinates
	 * @param coord
	 * @returns
	 */
	gestureAt(coord: Point) {
		const direction = this.getDirection(coord);
		const gAnim = `Gesture${direction}`;
		const lookAnim = `Look${direction}`;

		const animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
		return this.play(animation);
	}

	/**
	 * Remove the agent, and remove the elements from the dom
	 * @returns
	 */
	async destroy() {
		this.balloon.destroy();
		await this.animator.exitAnimation();
		await this.animator.showAnimation("Hide");
		this.el.remove();
	}

	/**
	 * Move the agent to the specified coordinates
	 * @param coord
	 * @param duration The amount of time that the agent is traveling, excluding start and stop animations
	 * @returns
	 */
	async moveTo(coord: Point, duration = 1000) {
		const dir = this.getDirection(coord);
		const anim = `Move${dir}`;

		// the simple case
		if (duration === 0) {
			this.el.style.top = `${coord[1]}px`;
			this.el.style.left = `${coord[0]}px`;
			this.reposition();
			return;
		}

		const branchFunction: BranchFunction = () => {
			this.el.animate(
				{ top: coord[1], left: coord[0] },
				{ duration, iterations: 1 },
			);
			return sleep(duration);
		};

		await this.animator.showAnimation(anim, branchFunction);
	}

	async play(name: string) {
		try {
			await this.animator.exitAnimation();
			await this.animator.showAnimation(name);
		} catch (err) {
			console.error(err);
		}
	}

	show() {
		this.el.style.visibility = "visible";

		const winWidth = window.innerWidth;
		const winHeight = window.innerHeight;
		const agentWidth = this.el.offsetWidth;
		const agentHeight = this.el.offsetHeight;

		// place agent in bottom right corner
		this.el.style.top = `calc(${winHeight - agentHeight}px - 3rem)`;
		this.el.style.left = `calc(${winWidth - agentWidth}px - 3rem`;

		return this.play("Show");
	}

	async speak(text: string, hold: boolean): Promise<void> {
		await this.balloon.speak(text, hold);
	}

	hasAnimation(name: string) {
		return this.animator.hasAnimation(name);
	}

	/***
	 * Gets a list of animation names
	 */
	animations() {
		return this.animator.animations();
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
	private getDirection(coord: Point): Direction {
		const rect = this.el.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const x = centerX - coord[0];
		const y = centerY - coord[1];

		const r = Math.round((180 * Math.atan2(y, x)) / Math.PI);

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
	onQueueEmpty() {
		if (!this.isVisible || this.isIdleAnimation()) {
			return;
		}
		const idleAnim = this.getIdleAnimation();
		this.animator.showAnimation(idleAnim);
	}

	/**
	 * Is the current animation Idle?
	 * @returns
	 */
	private isIdleAnimation(): boolean {
		const current = this.animator.currentAnimationName;
		return current ? current.startsWith("Idle") : false;
	}

	/**
	 * Get a random Idle animation
	 */
	private getIdleAnimation() {
		const idleAnimations = this.animations().filter((anim) =>
			anim.includes("Idle"),
		);

		const idx = Math.floor(Math.random() * idleAnimations.length);
		return idleAnimations[idx];
	}

	/**************************** Events ************************************/

	private async onDoubleClick() {
		if (this.hasAnimation("ClickedOn")) {
			await this.play("ClickedOn");
		} else {
			await this.animate();
		}
	}

	private reposition(x = this.el.offsetLeft, y = this.el.offsetTop) {
		if (!this.isVisible) {
			return;
		}

		const coord = this.sanitizeCoordinates([x, y]);
		this.el.style.left = `${coord[0]}px`;
		this.el.style.top = `${coord[1]}px`;
		this.balloon.reposition();
	}

	/**
	 * Bound the coordinates to the viewport
	 * @param coord
	 */
	private sanitizeCoordinates(coord: Point): Point {
		const margin = 5;
		const eHeight = this.el.offsetHeight;
		const eWidth = this.el.offsetWidth;

		let x = coord[0];
		if (x <= margin) {
			x = margin;
		} else if (x + eWidth + margin > window.innerWidth) {
			x = window.innerWidth - eWidth - margin;
		}

		let y = coord[1];
		if (y <= margin) {
			y = margin;
		} else if (y + eHeight + margin > window.innerHeight) {
			y = window.innerHeight - eHeight - margin;
		}

		return [x, y];
	}

	private dragStart(event: DragEvent) {
		const offset = getOffset(this.el);
		this.clickOffset = [event.pageX - offset[0], event.pageY - offset[1]];

		// use a dummy image to prevent the default dnd image
		event.dataTransfer?.setDragImage(imgDnd, 0, 0);
	}

	private drag(event: DragEvent) {
		if (this.clickOffset) {
			const x = event.clientX - this.clickOffset[0];
			const y = event.clientY - this.clickOffset[1];
			requestAnimationFrame(() => this.reposition(x, y));
		}
	}
}

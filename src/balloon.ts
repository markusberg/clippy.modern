import { sleep } from "./utils.js";

export type Side = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type Placement = "above" | "left" | "below" | "right";

export class Balloon {
	private balloon: HTMLDivElement;
	private content: HTMLDivElement;
	private hidingTimeout: number | null = null;

	private WORD_SPEAK_TIME = 200;
	private CLOSE_BALLOON_DELAY = 2000;
	private BALLOON_MARGIN = 15;

	private placement: Placement[] = ["above", "left", "below", "right"];

	constructor(private elAgent: HTMLElement) {
		this.balloon = document.createElement("div");
		this.balloon.className = "clippy-balloon";
		this.balloon.style.visibility = "hidden";

		const tipElement = document.createElement("div");
		tipElement.className = "clippy-tip";

		this.content = document.createElement("div");
		this.content.className = "clippy-content";
		this.balloon.appendChild(tipElement);
		this.balloon.appendChild(this.content);

		this.elAgent.insertAdjacentElement("afterend", this.balloon);

		document.body.append(this.balloon);
	}

	reposition(): void {
		for (const placement of this.placement) {
			this.balloon.classList.remove(`clippy-${placement}`);
		}

		let placement: Placement;
		let x: number;
		let y: number;

		if (this.spaceAbove) {
			x = this.optimalX;
			y =
				this.elAgent.offsetTop -
				this.balloon.offsetHeight -
				this.BALLOON_MARGIN;
			placement = "above";
		} else if (this.spaceLeft) {
			x = this.elAgent.offsetLeft - this.balloon.offsetWidth;
			y = this.optimalY;
			placement = "left";
		} else if (this.spaceBelow) {
			y =
				this.elAgent.offsetTop +
				this.elAgent.offsetHeight +
				this.BALLOON_MARGIN;
			x = this.optimalX;
			placement = "below";
		} else if (this.spaceRight) {
			x = this.elAgent.offsetLeft + this.elAgent.offsetWidth;
			y = this.optimalY;
			placement = "right";
		} else {
			console.error("no space for balloon");
			return;
		}

		this.balloon.style.left = `${x}px`;
		this.balloon.style.top = `${y}px`;
		this.balloon.classList.add(`clippy-${placement}`);
	}

	/**
	 * Get the optimal X value for above or below placement
	 */
	get optimalX(): number {
		const optimalX =
			this.elAgent.offsetLeft +
			(this.elAgent.offsetWidth - this.balloon.offsetWidth) / 2;

		return optimalX < 0
			? 0
			: optimalX + this.balloon.offsetWidth > window.innerWidth
			  ? window.innerWidth - this.balloon.offsetWidth
			  : optimalX;
	}

	/**
	 * Get the optimal Y value for left or right placement
	 */
	get optimalY(): number {
		const optimalY =
			this.elAgent.offsetTop +
			(this.elAgent.offsetHeight - this.balloon.offsetHeight) / 2;

		return optimalY < 0
			? 0
			: optimalY + this.balloon.offsetHeight > window.innerHeight
			  ? window.innerHeight - this.balloon.offsetHeight
			  : optimalY;
	}

	/**
	 * Will the balloon fit above the agent?
	 */
	get spaceAbove(): boolean {
		const balloonHeight = this.balloon.offsetHeight;
		const agentOffsetTop = this.elAgent.offsetTop;
		return agentOffsetTop - balloonHeight > 0;
	}

	/**
	 * Will the balloon fit below the agent?
	 */
	get spaceBelow(): boolean {
		const balloonHeight = this.balloon.offsetHeight;
		const agentOffsetTop = this.elAgent.offsetTop;
		const agentHeight = this.elAgent.offsetHeight;
		const winHeight = window.innerHeight;
		return agentOffsetTop + agentHeight + balloonHeight < winHeight;
	}

	/**
	 * Will the balloon fit to the left of the agent?
	 */
	get spaceLeft(): boolean {
		const balloonWidth = this.balloon.offsetWidth;
		const agentOffsetLeft = this.elAgent.offsetLeft;
		return agentOffsetLeft - balloonWidth > 0;
	}

	/**
	 * Will the balloon fit to the right of the agent?
	 */
	get spaceRight(): boolean {
		const balloonWidth = this.balloon.offsetWidth;
		const agentOffsetLeft = this.elAgent.offsetLeft;
		const agentWidth = this.elAgent.offsetWidth;
		const winWidth = window.innerWidth;
		return agentOffsetLeft + agentWidth + balloonWidth < winWidth;
	}

	async speak(text: string, hold: boolean) {
		if (this.hidingTimeout) {
			clearTimeout(this.hidingTimeout);
		}

		const words = text.split(/\s/g);

		this.hidenow();
		this.content.innerHTML = words.join(" ");
		this.reposition();

		this.balloon.style.visibility = "visible";

		for (let idx = 0; idx <= words.length; idx++) {
			this.content.innerHTML = words.slice(0, idx).join(" ");
			await sleep(this.WORD_SPEAK_TIME);
		}

		if (!hold) {
			this.hide();
		}
	}

	hidenow() {
		this.balloon.style.visibility = "hidden";
	}

	hide() {
		this.hidingTimeout = window.setTimeout(
			() => this.hidenow(),
			this.CLOSE_BALLOON_DELAY,
		);
	}

	destroy() {
		this.balloon.remove();
	}
}

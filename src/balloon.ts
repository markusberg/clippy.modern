import { sleep } from "./utils.js";

export type Side = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export class Balloon {
	private balloon: HTMLDivElement;
	private content: HTMLDivElement;
	private hidingTimeout: number | null = null;

	private WORD_SPEAK_TIME = 200;
	private CLOSE_BALLOON_DELAY = 2000;
	private BALLOON_MARGIN = 15;
	private sides: Side[] = [
		"top-left",
		"top-right",
		"bottom-left",
		"bottom-right",
	];

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

	reposition() {
		for (const side of this.sides) {
			this.position(side);
			if (!this.isOutOfFrame()) {
				break;
			}
		}
	}

	/**
	 * Position balloon on requested side of agent
	 * @param side
	 */
	private position(side: Side) {
		const agent = this.elAgent.getBoundingClientRect();
		const height = this.balloon.offsetHeight;
		const width = this.balloon.offsetWidth;

		for (const side of this.sides) {
			this.balloon.classList.remove(`clippy-${side}`);
		}

		let left = 0;
		let top = 0;
		switch (side) {
			case "top-left":
				// right side of the balloon next to the right side of the agent
				left = agent.left + agent.width - width;
				top = agent.top - height - this.BALLOON_MARGIN;
				break;
			case "top-right":
				// left side of the balloon next to the left side of the agent
				left = agent.left;
				top = agent.top - height - this.BALLOON_MARGIN;
				break;
			case "bottom-right":
				// right side of the balloon next to the right side of the agent
				left = agent.left;
				top = agent.top + agent.height + this.BALLOON_MARGIN;
				break;
			case "bottom-left":
				// left side of the balloon next to the left side of the agent
				left = agent.left + agent.width - width;
				top = agent.top + agent.height + this.BALLOON_MARGIN;
				break;
		}

		this.balloon.style.top = `${top}px`;
		this.balloon.style.left = `${left}px`;
		this.balloon.classList.add(`clippy-${side}`);
	}

	/**
	 * Is the balloon out of frame
	 * @returns
	 */
	private isOutOfFrame() {
		const height = this.balloon.offsetHeight;
		const width = this.balloon.offsetWidth;

		const boundingRect = this.balloon.getBoundingClientRect();
		const x = boundingRect.left - window.scrollX;
		const y = boundingRect.top - window.scrollY;

		const margin = 5;
		if (y - margin < 0 || x - margin < 0) {
			return true;
		}
		if (
			y + height + margin > window.innerHeight ||
			x + width + margin > window.innerWidth
		) {
			return true;
		}

		return false;
	}

	async speak(text: string, hold: boolean) {
		if (this.hidingTimeout) {
			clearTimeout(this.hidingTimeout);
		}

		const words = text.split(/\s/g);

		this.hidenow();
		this.content.innerHTML = words.join(" ");
		this.content.style.height = "auto";
		this.content.style.width = "15rem";
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

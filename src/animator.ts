import type {
	AgentAnimation,
	AgentConfig,
	AgentSound,
	Frame,
	FrameImage,
} from "./types.js";
import { type BranchFunction, sleep } from "./utils.js";

export class Animator {
	currentAnimationName: string | null = null;
	private currentFrameIndex = 0;
	private currentFrame: Frame | null = null;
	private currentAnimation: AgentAnimation | null = null;
	private sounds: Record<string, HTMLAudioElement> = {};
	private overlays: HTMLElement[];
	private state: "running" | "exiting" = "running";

	private branchFunction: BranchFunction = async () => {};

	constructor(
		private el: HTMLElement,
		private path: string,
		private data: AgentConfig,
		sounds: AgentSound,
	) {
		this.preloadSounds(sounds);

		this.overlays = [this.el];
		let curr = this.el;

		const size = this.data.framesize;
		this.setupElement(this.el, size);
		for (let i = 1; i < this.data.overlayCount; i++) {
			const el = document.createElement("div");
			const inner = this.setupElement(el, size);

			curr.append(inner);
			this.overlays.push(inner);
			curr = inner;
		}
	}

	private setupElement(el: HTMLElement, size: FrameImage) {
		const style = [
			"visibility: hidden",
			`width: ${size[0]}px`,
			`height: ${size[1]}px`,
			`background: url('${this.path}/map.png') no-repeat`,
		].join(";");
		el.setAttribute("style", style);

		return el;
	}

	animations(): string[] {
		return Object.keys(this.data.animations).sort();
	}

	private preloadSounds(sounds: AgentSound) {
		for (const key in sounds) {
			this.sounds[key] = new Audio(sounds[key]);
		}
	}
	hasAnimation(name: string) {
		return this.animations().includes(name);
	}

	exitAnimation() {
		this.state = "exiting";
		return this.step();
	}

	/**
	 * Show the requested animation
	 * @param name The name of the animation
	 * @param branchFunction If the animation uses exitBranching, this function will be awaited at that time before the animation continues
	 * @returns
	 */
	showAnimation(
		name: string,
		branchFunction: BranchFunction = () => sleep(3000),
	): Promise<void> {
		if (!this.hasAnimation(name)) {
			console.error(`no animation named ${name} is available for this agent`);
			return Promise.resolve(undefined);
		}

		this.currentAnimation = this.data.animations[name];
		this.currentAnimationName = name;
		this.branchFunction = branchFunction;

		this.state = "running";
		this.currentFrameIndex = 0;
		this.currentFrame = null;

		return this.step();
	}

	private draw(images: FrameImage[]) {
		this.overlays.forEach((overlay, idx) => {
			if (idx < images.length) {
				const xy = images[idx];
				const bg = `${-xy[0]}px ${-xy[1]}px`;
				overlay.style.visibility = "visible";
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				overlay.style["background-position" as any] = bg;
			} else {
				overlay.style.visibility = "hidden";
			}
		});
	}

	private getNextAnimationFrame(): number | null {
		if (this.currentFrame === null) {
			return 0;
		}
		const exitBranch = this.currentFrame.exitBranch;
		const branching = this.currentFrame.branching;

		if (this.state === "exiting" && exitBranch !== undefined) {
			return exitBranch;
		}
		if (branching) {
			let rnd = Math.random() * 100;
			for (let i = 0; i < branching.branches.length; i++) {
				const branch = branching.branches[i];
				if (rnd <= branch.weight) {
					return branch.frameIndex;
				}

				rnd -= branch.weight;
			}
		}

		return this.currentFrameIndex + 1;
	}

	private playSound(id: string) {
		const audio = this.sounds[id];
		if (audio) {
			audio.play();
		}
	}

	private render(frame: Frame) {
		if (frame.images) {
			this.draw(frame.images);
		}

		if (frame.sound) {
			this.playSound(frame.sound);
		}
	}

	private async step(): Promise<void> {
		const nextFrame = this.getNextAnimationFrame();
		if (
			this.currentAnimationName === null ||
			this.currentAnimation === null ||
			nextFrame === null
		) {
			return;
		}
		const newFrameIndex = Math.min(
			nextFrame,
			this.currentAnimation.frames.length - 1,
		);
		const frameChanged =
			!this.currentFrame || this.currentFrameIndex !== newFrameIndex;
		this.currentFrameIndex = newFrameIndex;

		const atLastFrame =
			this.currentFrameIndex >= this.currentAnimation.frames.length - 1;

		// always switch frame data,
		// unless we're at the last frame of an animation with a useExitBranching flag.
		if (!(atLastFrame && this.currentAnimation.useExitBranching)) {
			this.currentFrame = this.currentAnimation.frames[this.currentFrameIndex];
		}

		if (this.currentFrame) {
			this.render(this.currentFrame);
		}

		// fire events if the frames changed and we reached an end
		if (frameChanged && atLastFrame) {
			if (this.currentAnimation.useExitBranching && this.state !== "exiting") {
				await this.branchFunction();

				this.state = "exiting";
				return this.step();
			}
			this.currentAnimationName = null;
			this.currentFrameIndex = 0;
			this.currentFrame = null;
			this.currentAnimation = null;
			return;
		}

		if (this.currentFrame?.duration) {
			await sleep(this.currentFrame.duration);
		}
		return this.step();
	}
}

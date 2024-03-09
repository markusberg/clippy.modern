import {
	AgentAnimation,
	AgentConfig,
	AgentSound,
	Frame,
	FrameImage,
} from "./types.js";
import { sleep } from "./utils.js";

export type AnimatorState = "EXITED" | "WAITING";

export class Animator {
	currentAnimationName: string | null = null;
	_currentFrameIndex = 0;
	_currentFrame: Frame | null = null;
	_currentAnimation: AgentAnimation | null = null;
	_sounds: Record<string, HTMLAudioElement> = {};
	_overlays: HTMLElement[];
	_state: "running" | "exiting" = "running";

	constructor(
		private _el: HTMLElement,
		private _path: string,
		private _data: AgentConfig,
		sounds: AgentSound,
	) {
		this.preloadSounds(sounds);

		this._overlays = [this._el];
		let curr = this._el;

		const size = this._data.framesize;
		this._setupElement(this._el, size);
		for (let i = 1; i < this._data.overlayCount; i++) {
			const el = document.createElement("div");
			const inner = this._setupElement(el, size);

			curr.append(inner);
			this._overlays.push(inner);
			curr = inner;
		}
	}

	_setupElement(el: HTMLElement, size: FrameImage) {
		const style = [
			"visibility: hidden",
			`width: ${size[0]}px`,
			`height: ${size[1]}px`,
			`background: url('${this._path}/map.png') no-repeat`,
		].join(";");
		el.setAttribute("style", style);

		return el;
	}

	animations(): string[] {
		return Object.keys(this._data.animations).sort();
	}

	preloadSounds(sounds: AgentSound) {
		for (const key in sounds) {
			this._sounds[key] = new Audio(sounds[key]);
		}
	}
	hasAnimation(name: string) {
		return this.animations().includes(name);
	}

	exitAnimation() {
		this._state = "exiting";
		return this._step();
	}

	showAnimation(name: string): Promise<AnimatorState | undefined> {
		if (!this.hasAnimation(name)) {
			console.error(`no animation named ${name} is available for this agent`);
			return Promise.resolve(undefined);
		}

		this._currentAnimation = this._data.animations[name];
		this.currentAnimationName = name;

		this._state = "running";
		this._currentFrameIndex = 0;
		this._currentFrame = null;

		return this._step();
	}

	_draw(images: FrameImage[]) {
		this._overlays.forEach((overlay, idx) => {
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

	_getNextAnimationFrame(): number | null {
		if (this._currentFrame === null) {
			return 0;
		}
		const exitBranch = this._currentFrame.exitBranch;
		const branching = this._currentFrame.branching;

		if (this._state === "exiting" && exitBranch !== undefined) {
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

		return this._currentFrameIndex + 1;
	}

	_playSound(id: string) {
		const audio = this._sounds[id];
		if (audio) {
			audio.play();
		}
	}

	private render(frame: Frame) {
		if (frame.images) {
			this._draw(frame.images);
		}

		if (frame.sound) {
			this._playSound(frame.sound);
		}
	}

	async _step(): Promise<AnimatorState | undefined> {
		const nextFrame = this._getNextAnimationFrame();
		if (
			this.currentAnimationName === null ||
			this._currentAnimation === null ||
			nextFrame === null
		) {
			return;
		}
		const newFrameIndex = Math.min(
			nextFrame,
			this._currentAnimation.frames.length - 1,
		);
		const frameChanged =
			!this._currentFrame || this._currentFrameIndex !== newFrameIndex;
		this._currentFrameIndex = newFrameIndex;

		const atLastFrame =
			this._currentFrameIndex >= this._currentAnimation.frames.length - 1;

		// always switch frame data,
		// unless we're at the last frame of an animation with a useExitBranching flag.
		if (!(atLastFrame && this._currentAnimation.useExitBranching)) {
			this._currentFrame =
				this._currentAnimation.frames[this._currentFrameIndex];
		}

		if (this._currentFrame) {
			this.render(this._currentFrame);
		}

		// fire events if the frames changed and we reached an end
		if (frameChanged && atLastFrame) {
			if (
				this._currentAnimation.useExitBranching &&
				this._state !== "exiting"
			) {
				return "WAITING";
			}
			this.currentAnimationName = null;
			this._currentFrameIndex = 0;
			this._currentFrame = null;
			this._currentAnimation = null;
			return "EXITED";
		}

		if (this._currentFrame?.duration) {
			await sleep(this._currentFrame.duration);
		}
		return this._step();
	}
}

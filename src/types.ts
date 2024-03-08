export type AgentType =
	| "Clippy"
	| "Bonzi"
	| "F1"
	| "Genie"
	| "Genius"
	| "Links"
	| "Merlin"
	| "Peedy"
	| "Rocky"
	| "Rover";

export type AgentSound = Record<string, string>;

export interface AgentWrapper {
	name: AgentType;
	path: string;
	config: AgentConfig;
	sound: AgentSound;
}

export interface AgentConfig {
	overlayCount: number;
	framesize: FrameImage;
	animations: Record<string, AgentAnimation>;
}

export interface Branch {
	frameIndex: number;
	weight: number;
}

export type FrameImage = [number, number];

export interface Frame {
	images?: FrameImage[];
	duration: number;
	branching?: {
		branches: Branch[];
	};
	exitBranch?: number;
	sound?: string;
}

export interface AgentAnimation {
	useExitBranching?: boolean;
	frames: Frame[];
}

export type Point = [number, number];

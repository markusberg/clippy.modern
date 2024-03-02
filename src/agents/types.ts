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

export const agents: AgentType[] = [
  "Clippy",
  "Bonzi",
  "F1",
  "Genie",
  "Genius",
  "Links",
  "Merlin",
  "Peedy",
  "Rocky",
  "Rover",
];

export type AgentSound = Record<string, string>;

export interface AgentWrapper {
  name: AgentType;
  path: string;
  config: AgentConfig;
  sound: AgentSound;
}

export interface AgentConfig {
  overlayCount: number;
  sounds: string[];
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
  useExitBranching?: boolean;
  exitBranch?: number;
  sound?: string;
}

export interface AgentAnimation {
  useExitBranching?: boolean;
  frames: Frame[];
}

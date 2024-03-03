import { Agent } from "./agent.js";
import { AgentConfig, AgentSound, AgentType } from "./agents/types.js";

export async function load(name: AgentType, path?: string): Promise<Agent> {
  const fullpath = path ? `${path}/${name}` : `./agents/${name}`;
  const data = await loadAgent(fullpath);
  const sounds = await loadSounds(fullpath);
  return new Agent(fullpath, data, sounds);
}

async function loadAgent(path: string): Promise<AgentConfig> {
  const url = `${path}/agent.json`;
  const result = await fetch(url);
  if (result.ok) {
    const agent: AgentConfig = await result.json();
    return agent;
  }
  throw result;
}

async function loadSounds(path: string): Promise<AgentSound> {
  try {
    const audio = document.createElement("audio");
    const canPlayMp3 = "" !== audio.canPlayType("audio/mpeg");
    const canPlayOgg = "" !== audio.canPlayType('audio/ogg; codecs="vorbis"');

    if (!canPlayMp3 && !canPlayOgg) {
      throw new Error("Unable to play mp3 or ogg");
    }
    const filename = canPlayOgg ? "sounds-ogg" : "sounds-mp3";
    const url = `${path}/${filename}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to download sounds: ${url}`);
    }

    const sounds: AgentSound = await response.json();
    return sounds;
  } catch (err) {
    console.error(err);
    return {};
  }
}

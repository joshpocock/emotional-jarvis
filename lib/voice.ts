// Which voice Jarvis speaks in. Your own cloned voice lives in data/voice.json; without it, the default.
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_VOICE = process.env.JARVIS_VOICE_ID || "bf322df2096a46f18c579d0baa36f41d"; // Fish public voice "Adrian"

const FILE = join(process.cwd(), "data", "voice.json");

export type MyVoice = { voice_id: string; title: string; created_at: string };

export function myVoice(): MyVoice | null {
  if (!existsSync(FILE)) return null;
  try {
    const v = JSON.parse(readFileSync(FILE, "utf8")) as MyVoice;
    return v.voice_id ? v : null;
  } catch {
    return null;
  }
}

export function saveMyVoice(v: MyVoice) {
  writeFileSync(FILE, JSON.stringify(v, null, 2) + "\n");
}

export function forgetMyVoice() {
  if (existsSync(FILE)) unlinkSync(FILE);
}

// Read on every reply, so switching takes effect straight away.
export function jarvisVoice(): string {
  return myVoice()?.voice_id || DEFAULT_VOICE;
}

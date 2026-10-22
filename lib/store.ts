// In-memory state for one local user: the conversation and the audio waiting to be spoken.
// Kept on globalThis so every route handler shares it, even across dev reloads.
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";

export const JARVIS_VOICE = process.env.JARVIS_VOICE_ID || "bf322df2096a46f18c579d0baa36f41d"; // Fish public voice "Adrian"

type Job = { text: string; voice: string | string[] };
type Store = { history: Anthropic.MessageParam[]; pending: Map<string, Job> };

const g = globalThis as unknown as { __jarvis?: Store };
export const store: Store = (g.__jarvis ??= { history: [], pending: new Map() });

// Park text for the audio route, which streams it from Drama 3 when the page asks for it.
export function queueAudio(text: string, voice: string | string[] = JARVIS_VOICE): string {
  const id = randomUUID();
  store.pending.set(id, { text, voice });
  return `/api/audio/${id}`;
}

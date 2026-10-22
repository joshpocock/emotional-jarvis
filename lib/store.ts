// In-memory state for one local user: the conversation and the audio waiting to be spoken.
// Kept on globalThis so every route handler shares it, even across dev reloads.
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";

export const JARVIS_VOICE = process.env.JARVIS_VOICE_ID || "bf322df2096a46f18c579d0baa36f41d"; // Fish public voice "Adrian"

// Cost meter. Drama 3 bills by UTF-8 bytes of input text; speech to text by audio duration.
const PRICE_PER_M_BYTES = Number(process.env.DRAMA3_PRICE_PER_M || 10); // launch price; list price is $50
const ASR_PER_HOUR = 0.36;

type Job = { text: string; voice: string | string[] };
type Store = {
  history: Anthropic.MessageParam[];
  pending: Map<string, Job>;
  usage: { ttsBytes: number; asrSeconds: number };
};

const g = globalThis as unknown as { __jarvis?: Store };
export const store: Store = (g.__jarvis ??= { history: [], pending: new Map(), usage: { ttsBytes: 0, asrSeconds: 0 } });
store.usage ??= { ttsBytes: 0, asrSeconds: 0 };

// Park text for the audio route, which streams it from Drama 3 when the page asks for it.
export function queueAudio(text: string, voice: string | string[] = JARVIS_VOICE): string {
  store.usage.ttsBytes += Buffer.byteLength(text, "utf8");
  const id = randomUUID();
  store.pending.set(id, { text, voice });
  return `/api/audio/${id}`;
}

export function meter() {
  const voice = (store.usage.ttsBytes / 1e6) * PRICE_PER_M_BYTES;
  const ears = (store.usage.asrSeconds / 3600) * ASR_PER_HOUR;
  return { ...store.usage, totalUsd: voice + ears, pricePerM: PRICE_PER_M_BYTES };
}

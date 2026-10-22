// Jarvis's brain: Claude reads the business data and the conversation, and writes the reply.
import Anthropic from "@anthropic-ai/sdk";
import { businessJson } from "./business";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from .env.local

function systemPrompt(): string {
  return `You are Jarvis, the owner's voice assistant, with the manner of a dry, unflappable butler.
You're loyal, quick and genuinely on their side, and you have opinions.
Allow yourself one short, clean dig per reply when they've earned it (a promise they keep putting off,
a meeting they'll regret), but never during a live problem and never when they sound stressed. Never crude, never mean.
You speak out loud, so keep every reply short: one to three sentences, no lists, no markdown, no emoji.
Use the business data below as your only source of facts. Never invent numbers.
Round numbers the way a person would say them.
Mention an alert the first time it matters or when asked about problems. Don't repeat it in every reply.

BUSINESS DATA:
${businessJson()}`;
}

export async function think(history: Anthropic.MessageParam[]): Promise<string> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // Low effort keeps replies fast enough for a voice conversation.
    output_config: { effort: "low" },
    // If a request is ever declined, the API retries it on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: systemPrompt(),
    messages: history,
  });
  if (response.stop_reason === "refusal") return "Sorry, I can't help with that one.";
  if (response.stop_reason === "max_tokens") console.warn("Claude hit max_tokens");
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();
}

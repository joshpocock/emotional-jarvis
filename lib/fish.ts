// Fish Audio: speech to text (transcribe-1-pro) and text to speech (drama-3).
const API = "https://api.fish.audio";

function key(): string {
  const k = process.env.FISH_API_KEY;
  if (!k) throw new Error("FISH_API_KEY is missing. Copy .env.example to .env.local and add your key.");
  return k;
}

export type Heard = { text: string; language?: string; language_code?: string; duration?: number };

// Transcribe one recording.
export async function transcribe(audio: Blob): Promise<Heard> {
  const form = new FormData();
  form.append("audio", audio, "speech.webm");
  form.append("ignore_timestamps", "true");
  const res = await fetch(`${API}/v1/asr`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, model: "transcribe-1-pro" },
    body: form,
  });
  if (!res.ok) throw new Error(`Fish speech to text ${res.status}: ${await res.text()}`);
  const out = (await res.json()) as Heard;
  // transcribe-1-pro adds speaker markers like <|speaker:0|>; Jarvis only has one speaker.
  out.text = (out.text || "").replace(/<\|speaker:\d+\|>/g, "").trim();
  return out;
}

// Start a Drama 3 synthesis. Returns the streaming response (chunked MP3).
// voice: one voice ID, or an array of IDs for multi-speaker text.
export async function speak(text: string, voice: string | string[]): Promise<Response> {
  const res = await fetch(`${API}/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      // Without this header Fish silently falls back to s2.1-pro.
      model: "drama-3",
    },
    body: JSON.stringify({ text, reference_id: voice, format: "mp3", latency: "balanced" }),
  });
  if (!res.ok) throw new Error(`Fish text to speech ${res.status}: ${await res.text()}`);
  return res;
}

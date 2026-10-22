// Use my voice: your 30-second recording becomes a private Fish Audio voice, and Jarvis speaks in it from then on.
// DELETE switches back to the default voice.
import { cloneVoice } from "@/lib/fish";
import { queueAudio, meter } from "@/lib/store";
import { saveMyVoice, forgetMyVoice } from "@/lib/voice";

export async function POST(request: Request) {
  try {
    const audio = await request.blob();
    if (audio.size < 10_000) return Response.json({ error: "That recording came through empty. Check your microphone and try again." }, { status: 400 });
    const title = `Jarvis (my voice) ${new Date().toISOString().slice(0, 10)}`;
    const voice_id = await cloneVoice(audio, title);
    saveMyVoice({ voice_id, title, created_at: new Date().toISOString() });
    const reply = "[warm, amused] Well. This is unsettling. [dry] I sound like you now, and I'll keep sounding like you until you tell me otherwise.";
    return Response.json({ voice_id, reply, audio: queueAudio(reply, voice_id), meter: meter() });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    forgetMyVoice();
    const reply = "[calm] Back to my own voice. Rather a relief, if I'm honest.";
    return Response.json({ reply, audio: queueAudio(reply), meter: meter() });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

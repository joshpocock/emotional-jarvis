// You talk (audio) or type (JSON). Fish Audio transcribes, Claude answers, and the reply is queued for Drama 3.
import { transcribe, type Heard } from "@/lib/fish";
import { think } from "@/lib/brain";
import { store, queueAudio } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const type = request.headers.get("content-type") || "";
    let heard: Heard;
    if (type.startsWith("application/json")) {
      const { text } = await request.json();
      heard = { text: String(text || "") };
    } else {
      heard = await transcribe(await request.blob());
    }
    if (!heard.text) return Response.json({ heard: "", reply: "", note: "I didn't catch that." });

    store.history.push({ role: "user", content: heard.text });
    const reply = await think(store.history.slice(-12));
    store.history.push({ role: "assistant", content: reply });

    return Response.json({ heard: heard.text, reply, audio: queueAudio(reply) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

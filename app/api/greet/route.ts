// Start my day: Jarvis greets you and briefs you on what matters most, in the right mood, before you ask anything.
import { think } from "@/lib/brain";
import { store, queueAudio, meter } from "@/lib/store";
import { state } from "@/lib/actions";

export async function POST(request: Request) {
  try {
    const { now } = await request.json().catch(() => ({ now: "" }));
    const cue = `[The owner just opened the dashboard. Their local time is ${now || "unknown"}. Greet them by name for the time of day, then brief them on the one or two things that matter most today, in two or three sentences. Don't take any actions.]`;
    const ask = { role: "user" as const, content: cue };
    const { reply } = await think([...store.history.slice(-11), ask]);
    store.history.push(ask, { role: "assistant", content: reply });
    return Response.json({ reply, audio: queueAudio(reply), business: state(), meter: meter() });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

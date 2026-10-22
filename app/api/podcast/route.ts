// Brief me like a podcast: Claude writes a two-host episode, Drama 3 plays both voices from ONE request.
import { podcastScript } from "@/lib/brain";
import { queueAudio, meter, JARVIS_VOICE } from "@/lib/store";

const COHOST = process.env.COHOST_VOICE_ID || "c70cfb98867a4bfb9ae20d2401257b92"; // Fish public voice "Delia"

export async function POST() {
  try {
    const script = await podcastScript();
    // One voice per speaker, in the same order as the <|speaker:N|> tags.
    const audio = queueAudio(script, [JARVIS_VOICE, COHOST]);
    return Response.json({ script, audio, meter: meter() });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

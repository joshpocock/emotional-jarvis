// Streams a queued reply from Drama 3, so the page starts playing while Fish Audio is still generating.
import { speak } from "@/lib/fish";
import { store } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = store.pending.get(id);
  if (!job) return Response.json({ error: "unknown audio id" }, { status: 404 });
  store.pending.delete(id);
  try {
    const fish = await speak(job.text, job.voice);
    return new Response(fish.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

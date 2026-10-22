// Start a fresh conversation.
import { store } from "@/lib/store";

export async function POST() {
  store.history.length = 0;
  return Response.json({ ok: true });
}

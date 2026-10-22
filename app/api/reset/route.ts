// Start a fresh conversation.
import { store } from "@/lib/store";
import { resetState } from "@/lib/actions";

export async function POST() {
  store.history.length = 0;
  resetState();
  return Response.json({ ok: true });
}

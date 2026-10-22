"use client";
// Use my voice: read a paragraph aloud for 30 seconds, and Fish Audio turns it into a private voice for Jarvis.
import { useEffect, useRef, useState } from "react";

const SECONDS = 30;
// Long enough that nobody runs out before the 30 seconds are up, with a mix of tones for the clone to learn from.
const PARAGRAPH =
  "Good morning. Let's see what today has in store. Revenue is up on last week, which is lovely, and there are a few new leads worth a call before lunch. " +
  "One invoice is still unpaid, and honestly, I should have chased it days ago. The two o'clock looks important, so I'll want the notes ready by half past one. " +
  "If anything urgent comes in, tell me straight away. Otherwise, let's keep it calm, get the big things done first, and finish early for once. Right. Where shall we start?";

type Step = "ready" | "recording" | "creating";
export type Cloned = { reply: string; audio: string; meter?: { ttsBytes: number; asrSeconds: number; totalUsd: number; pricePerM: number } };

export default function VoiceSetup({ onClose, onCreated }: { onClose: () => void; onCreated: (out: Cloned) => void }) {
  const [step, setStep] = useState<Step>("ready");
  const [left, setLeft] = useState(SECONDS);
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const cancelled = useRef(false);

  // Let go of the microphone if the panel closes mid-recording.
  useEffect(
    () => () => {
      cancelled.current = true;
      if (rec.current?.state === "recording") rec.current.stop();
    },
    [],
  );

  async function upload(audio: Blob) {
    setStep("creating");
    const out = await (await fetch("/api/voice", { method: "POST", headers: { "content-type": "audio/webm" }, body: audio })).json().catch(() => ({ error: "The server didn't answer." }));
    if (out.error) {
      setError(out.error);
      setStep("ready");
      return;
    }
    onCreated(out);
  }

  async function record() {
    setError("");
    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("I need the microphone for this. Allow it in your browser and try again.");
      return;
    }
    const chunks: Blob[] = [];
    const r = new MediaRecorder(mic, { mimeType: "audio/webm;codecs=opus" });
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      mic.getTracks().forEach((t) => t.stop());
      clearInterval(tick);
      if (!cancelled.current) upload(new Blob(chunks, { type: "audio/webm" }));
    };
    const started = Date.now();
    const tick = setInterval(() => {
      const remaining = Math.max(0, SECONDS - Math.floor((Date.now() - started) / 1000));
      setLeft(remaining);
      if (remaining === 0 && r.state === "recording") r.stop();
    }, 200);
    cancelled.current = false;
    rec.current = r;
    setLeft(SECONDS);
    setStep("recording");
    r.start();
  }

  function cancel() {
    cancelled.current = true;
    if (rec.current?.state === "recording") rec.current.stop();
    onClose();
  }

  const progress = ((SECONDS - left) / SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="voice-title">
      <div className="card w-full max-w-[620px] !bg-[#0e0d0a] p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div id="voice-title" className="text-[19px] font-semibold">Use my voice</div>
            <p className="mt-1 text-[14px] text-muted">
              Read this out loud, at your normal pace, somewhere quiet. Jarvis will speak in your voice from then on.
            </p>
          </div>
          {step !== "creating" && (
            <button onClick={cancel} className="text-[13px] text-muted transition hover:text-text">
              Cancel
            </button>
          )}
        </div>

        <p className={`mt-5 rounded-xl border border-line bg-panel p-5 text-[18px] leading-[1.6] transition ${step === "recording" ? "border-[rgba(212,176,76,0.45)]" : ""}`}>
          {PARAGRAPH}
        </p>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-panel-strong">
          <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${step === "ready" ? 0 : progress}%` }} />
        </div>

        <div className="mt-5 flex min-h-[52px] items-center justify-between gap-4">
          <div className="text-[14px]" aria-live="polite">
            {error && <span className="text-danger">{error}</span>}
            {!error && step === "ready" && <span className="text-muted">Takes {SECONDS} seconds. Recording stops on its own.</span>}
            {step === "recording" && (
              <span className="flex items-center gap-2.5 text-accent">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
                Recording, {left}s left
              </span>
            )}
            {step === "creating" && <span className="text-accent">Building your voice on Fish Audio…</span>}
          </div>
          {step === "ready" && (
            <button
              onClick={record}
              className="shrink-0 rounded-full border border-[rgba(212,176,76,0.45)] bg-accent-soft px-6 py-3 text-[15px] font-semibold transition hover:bg-[rgba(212,176,76,0.24)]"
            >
              {error ? "Try again" : "Start recording"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

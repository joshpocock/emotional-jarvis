"use client";
// The Jarvis dashboard: your numbers on the left, Jarvis in the middle, your day on the right.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Business } from "@/lib/business";
import Orb from "./Orb";

type Who = "you" | "jarvis" | "host0" | "host1";
type Message = { who: Who; text: string; tags?: string[]; done?: string[] };
type Live = Business & { outbox?: { to: string; subject: string; body: string; at: string }[] };
type Mode = "idle" | "listening" | "thinking" | "speaking";
type Meter = { ttsBytes: number; asrSeconds: number; totalUsd: number; pricePerM: number };

const NAMES: Record<Who, string> = { you: "YOU", jarvis: "JARVIS", host0: "HOST 1", host1: "HOST 2" };
const WHO_COLOR: Record<Who, string> = { you: "text-muted", jarvis: "text-accent", host0: "text-accent", host1: "text-[#c9c6bc]" };
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

// Drama 3 directions look like [calm, warm] and <emphasis>word</emphasis>.
// Hide them from what the viewer reads, and show them as chips instead.
const DIRECTION = /\[([^\]]+)\]/g;
function spoken(reply: string) {
  return reply.replace(DIRECTION, "").replace(/<\/?\w+>/g, "").replace(/\s{2,}/g, " ").trim();
}
function directions(reply: string) {
  return [...reply.matchAll(DIRECTION)].map((m) => m[1].trim());
}

export default function Dashboard({ data: initial }: { data: Business }) {
  // Jarvis can change the data (send, move, tick off), so the dashboard shows the live copy.
  const [data, setData] = useState<Live>(initial);
  const [changed, setChanged] = useState(0);
  const [log, setLog] = useState<Message[]>([]);
  const [caption, setCaption] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [status, setStatus] = useState("Hold space to talk");
  const [typed, setTyped] = useState("");
  const [cost, setCost] = useState<Meter | null>(null);
  const [bumpKey, setBumpKey] = useState(0);
  const showMeter = useCallback((m?: Meter) => {
    if (!m) return;
    setCost(m);
    setBumpKey((k) => k + 1);
  }, []);

  const voice = useRef<HTMLAudioElement>(null);
  const ctx = useRef<AudioContext | null>(null);
  const outAnalyser = useRef<AnalyserNode | null>(null);
  const micAnalyser = useRef<AnalyserNode | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const modeRef = useRef<Mode>("idle");
  const logEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [log]);

  // ---------- audio levels for the orb ----------
  const audioCtx = useCallback(() => {
    if (!ctx.current) {
      const c = new AudioContext();
      const an = c.createAnalyser();
      an.fftSize = 256;
      c.createMediaElementSource(voice.current!).connect(an);
      an.connect(c.destination);
      ctx.current = c;
      outAnalyser.current = an;
    }
    return ctx.current;
  }, []);

  const level = useCallback(() => {
    const an = modeRef.current === "listening" ? micAnalyser.current : outAnalyser.current;
    if (!an) return 0;
    const d = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(d);
    return d.reduce((a, b) => a + b, 0) / d.length / 255;
  }, []);

  // ---------- talking to the server ----------
  const play = useCallback(
    async (url: string) => {
      await audioCtx().resume();
      setMode("speaking");
      setStatus("Speaking");
      const el = voice.current!;
      el.src = url;
      await el.play();
      await new Promise((r) => (el.onended = r));
      setMode("idle");
      setStatus("Hold space to talk");
    },
    [audioCtx],
  );

  const send = useCallback(
    async (body: BodyInit, type: string) => {
      setMode("thinking");
      setStatus("Thinking…");
      const out = await (await fetch("/api/talk", { method: "POST", headers: { "content-type": type }, body })).json();
      if (out.error || !out.heard) {
        setStatus(out.error || out.note || "I didn't catch that.");
        setMode("idle");
        return;
      }
      const heardTags = directions(out.heard).map((d) => `you sounded: ${d}`);
      if (out.language && out.language !== "English") heardTags.unshift(out.language);
      setLog((l) => [
        ...l,
        { who: "you", text: spoken(out.heard), tags: heardTags },
        { who: "jarvis", text: spoken(out.reply), tags: directions(out.reply), done: (out.done || []).map((d: { action: string; detail: string }) => `${d.action}: ${d.detail}`) },
      ]);
      if (out.business) setData(out.business);
      if (out.done?.length) setChanged((n) => n + 1);
      setCaption(spoken(out.reply));
      showMeter(out.meter);
      await play(out.audio);
    },
    [play, showMeter],
  );

  // ---------- brief me like a podcast: two hosts, one Drama 3 request ----------
  const podcast = useCallback(async () => {
    setMode("thinking");
    setStatus("Writing the episode…");
    const out = await (await fetch("/api/podcast", { method: "POST" })).json();
    if (out.error) {
      setStatus(out.error);
      setMode("idle");
      return;
    }
    const parts: string[] = out.script.split(/<\|speaker:(\d+)\|>/); // ["", "0", "line", "1", "line", ...]
    const lines: Message[] = [];
    for (let i = 1; i < parts.length; i += 2) {
      lines.push({ who: `host${parts[i]}` as Who, text: spoken(parts[i + 1]), tags: directions(parts[i + 1]) });
    }
    setLog((l) => [...l, ...lines]);
    setCaption("");
    showMeter(out.meter);
    await play(out.audio);
  }, [play, showMeter]);

  // ---------- start my day: Jarvis briefs you first ----------
  const [started, setStarted] = useState(false);
  const greet = useCallback(async () => {
    setStarted(true);
    setMode("thinking");
    setStatus("Waking up…");
    const now = new Date().toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" });
    const out = await (await fetch("/api/greet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ now }) })).json();
    if (out.error) {
      setStatus(out.error);
      setMode("idle");
      return;
    }
    setLog((l) => [...l, { who: "jarvis", text: spoken(out.reply), tags: directions(out.reply) }]);
    setCaption(spoken(out.reply));
    showMeter(out.meter);
    await play(out.audio);
  }, [play, showMeter]);

  // ---------- hold to talk (button or space bar) ----------
  const startTalking = useCallback(async () => {
    if (rec.current?.state === "recording") return;
    const c = audioCtx();
    await c.resume();
    stream.current ??= await navigator.mediaDevices.getUserMedia({ audio: true });
    const an = c.createAnalyser();
    an.fftSize = 256;
    c.createMediaStreamSource(stream.current).connect(an);
    micAnalyser.current = an;
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream.current, { mimeType: "audio/webm;codecs=opus" });
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => send(new Blob(chunks, { type: "audio/webm" }), "audio/webm");
    r.start();
    rec.current = r;
    voice.current?.pause();
    setMode("listening");
    setStatus("Listening…");
  }, [audioCtx, send]);

  const stopTalking = useCallback(() => {
    if (rec.current?.state === "recording") rec.current.stop();
  }, []);

  useEffect(() => {
    const typing = () => document.activeElement?.tagName === "INPUT";
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !typing() && !e.repeat) {
        e.preventDefault();
        startTalking();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && !typing()) stopTalking();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerup", stopTalking);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerup", stopTalking);
    };
  }, [startTalking, stopTalking]);

  const t = data.today;
  const change = Math.round(((t.revenue_this_week - t.revenue_last_week) / t.revenue_last_week) * 100);
  const live = mode !== "idle";

  return (
    <main className="mx-auto grid min-h-screen max-w-[1440px] grid-rows-[auto_1fr_auto] gap-5 px-7 py-6">
      {/* header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[14px] font-bold tracking-[0.28em]">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_14px_var(--accent)]" />
          JARVIS
          <span className="ml-3 text-[12px] font-medium tracking-normal text-muted">{data.business}</span>
        </div>
        <div
          className="flex items-baseline gap-2.5 rounded-full border border-line bg-panel px-4 py-2 text-[13px]"
          title="Drama 3 bills by text size; speech to text by audio length"
        >
          <span className="label">Voice spend</span>
          <span key={bumpKey} className={`text-[17px] font-bold tabular-nums text-accent ${bumpKey ? "bump" : ""}`}>
            ${(cost?.totalUsd ?? 0).toFixed(4)}
          </span>
          <span className="hidden text-muted md:inline">
            {(cost?.ttsBytes ?? 0).toLocaleString("en-US")} characters sent to Drama 3, at ${cost?.pricePerM ?? 10} per million
          </span>
        </div>
        <div className={`min-w-[150px] text-right text-[14px] ${live ? "text-accent" : "text-muted"}`}>{status}</div>
      </header>

      {/* three columns */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr_300px]">
        {/* left: numbers and alerts */}
        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="label">Revenue this week</div>
            <div className="mt-2 text-[34px] font-bold tabular-nums">{money(t.revenue_this_week)}</div>
            <div className={`mt-1 text-[13px] font-semibold ${change >= 0 ? "text-good" : "text-danger"}`}>
              {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs last week ({money(t.revenue_last_week)})
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="label">New leads</div>
              <div className="mt-2 text-[28px] font-bold tabular-nums">{t.new_leads}</div>
            </div>
            <div className="card p-5">
              <div className="label">Tickets</div>
              <div className="mt-2 text-[28px] font-bold tabular-nums">{t.open_support_tickets}</div>
            </div>
          </div>
          <div className="card p-5">
            <div className="label">Alerts</div>
            <ul className="mt-3 flex flex-col gap-2">
              {data.alerts.length === 0 && <li className="text-[14px] text-muted">All clear</li>}
              {data.alerts.map((a, i) => (
                <li key={i} className="flex gap-2.5 rounded-xl border border-[rgba(240,113,90,0.35)] bg-[rgba(240,113,90,0.08)] p-3 text-[13px] leading-snug">
                  <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-danger" />
                  {a.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* center: Jarvis */}
        <div className="card flex min-h-[560px] flex-col items-center justify-between overflow-hidden px-6 pb-4 pt-6">
          <Orb level={level} />
          {!started && log.length === 0 ? (
            <button
              onClick={greet}
              className="rounded-full border border-[rgba(212,176,76,0.45)] bg-accent-soft px-8 py-4 text-[17px] font-semibold transition hover:bg-[rgba(212,176,76,0.24)]"
            >
              Start my day
            </button>
          ) : (
            <p className="min-h-[64px] max-w-[640px] text-center text-[21px] font-medium leading-[1.45]">{caption}</p>
          )}
          <div className="log mt-3 flex max-h-[200px] w-full flex-col gap-2.5 overflow-y-auto pt-4">
            {log.map((m, i) => (
              <div key={i} className="grid grid-cols-[64px_1fr] gap-3 text-[14px] leading-relaxed">
                <div className={`pt-0.5 text-[11px] font-semibold tracking-[0.12em] ${WHO_COLOR[m.who]}`}>
                  {NAMES[m.who]}
                </div>
                <div>
                  {m.text}
                  {m.done && m.done.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.done.map((d, j) => (
                        <span key={j} className="chip chip-done">
                          ✓ {d}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.tags && m.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.tags.map((tag, j) => (
                        <span key={j} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={logEnd} />
          </div>
        </div>

        {/* right: today and tasks */}
        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="label">Today</div>
            <ul className="mt-3 flex flex-col gap-3">
              {data.calendar.map((c) => (
                <li key={`${c.title}-${c.time}-${c.day ?? ""}`} className={`${changed ? "flash" : ""} grid grid-cols-[52px_1fr] gap-3 text-[14px] ${c.day ? "opacity-60" : ""}`}>
                  <span className="font-semibold tabular-nums text-accent">{c.time}</span>
                  <span>
                    {c.title}
                    {c.day && <span className="chip chip-muted ml-2">moved to {c.day}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <div className="label">Promised and not done</div>
            <ul className="mt-3 flex flex-col gap-3">
              {data.tasks.map((task) => {
                const finished = task.status === "done";
                return (
                  <li key={`${task.title}-${task.status}`} className={`${changed ? "flash" : ""} text-[14px] leading-snug ${finished ? "text-muted" : ""}`}>
                    <div className={finished ? "line-through" : ""}>
                      {finished && <span className="mr-1.5 text-good">✓</span>}
                      {task.title}
                    </div>
                    <div className="mt-1 flex gap-2 text-[12px]">
                      <span className="chip chip-muted">promised {task.promised}</span>
                      {finished ? (
                        <span className="chip chip-done">done</span>
                      ) : (
                        <span className="chip !border-[rgba(240,113,90,0.35)] !bg-[rgba(240,113,90,0.08)] !text-danger">{task.status}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {data.outbox && data.outbox.length > 0 && (
            <div className="card p-5">
              <div className="label">Outbox</div>
              <ul className="mt-3 flex flex-col gap-3">
                {data.outbox.map((m) => (
                  <li key={m.at} className="flash text-[13px] leading-snug">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{m.subject}</span>
                      <span className="chip chip-done">sent</span>
                    </div>
                    <div className="mt-1 text-muted">to {m.to}</div>
                    <div className="mt-1.5 line-clamp-3 text-[12px] text-muted">{m.body}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      {/* controls */}
      <footer className="flex items-center gap-3.5">
        <button
          onPointerDown={startTalking}
          className={`inline-flex select-none items-center gap-2.5 rounded-full border px-6 py-[15px] text-[15px] font-semibold transition ${
            mode === "listening" ? "scale-[1.04] border-accent bg-accent text-black" : "border-[rgba(212,176,76,0.45)] bg-accent-soft hover:bg-[rgba(212,176,76,0.24)]"
          }`}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
          Hold to talk
        </button>
        <button
          onClick={podcast}
          className="inline-flex items-center gap-2.5 rounded-full border border-line px-6 py-[15px] text-[15px] font-semibold transition hover:border-[rgba(212,176,76,0.45)]"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
            <rect x="3" y="14" width="4" height="6" rx="1.5" />
            <rect x="17" y="14" width="4" height="6" rx="1.5" />
          </svg>
          Brief me like a podcast
        </button>
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!typed.trim()) return;
            send(JSON.stringify({ text: typed.trim() }), "application/json");
            setTyped("");
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="or type to Jarvis…"
            className="w-full rounded-full border border-line bg-panel px-[18px] py-[15px] text-[15px] outline-none focus:border-[rgba(212,176,76,0.5)]"
          />
        </form>
      </footer>
      <audio ref={voice} />
    </main>
  );
}

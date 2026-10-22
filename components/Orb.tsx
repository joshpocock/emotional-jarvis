"use client";
// A glowing orb that breathes when idle, swells with whatever audio level it is given,
// and takes on the colour of the mood Jarvis is speaking in.
import { useEffect, useRef } from "react";

// Mood palettes: glow colour, core highlight, core mid, core shadow, and how fast the rings move.
export type Mood = "warm" | "alert" | "dry" | "soft";
const PALETTE: Record<Mood, { glow: number[]; hi: number[]; mid: number[]; lo: number[]; speed: number }> = {
  warm: { glow: [212, 176, 76], hi: [255, 244, 207], mid: [224, 189, 90], lo: [90, 70, 18], speed: 1 },
  alert: { glow: [240, 92, 70], hi: [255, 214, 200], mid: [232, 84, 60], lo: [96, 20, 12], speed: 2.2 },
  dry: { glow: [168, 132, 240], hi: [236, 226, 255], mid: [150, 116, 226], lo: [46, 30, 92], speed: 0.8 },
  soft: { glow: [96, 168, 240], hi: [222, 240, 255], mid: [92, 160, 232], lo: [18, 50, 96], speed: 0.5 },
};

const rgba = (c: number[], a: number) => `rgba(${c.map(Math.round).join(",")},${a})`;
const towards = (from: number[], to: number[], k: number) => from.map((v, i) => v + (to[i] - v) * k);

export default function Orb({ level, mood }: { level: () => number; mood: () => Mood }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const g = cv.getContext("2d")!;
    let smooth = 0;
    let raf = 0;
    const now = { ...PALETTE.warm };
    const draw = (t: number) => {
      smooth += (level() - smooth) * 0.18;
      // Ease the colours towards the current mood so a change mid-sentence glides instead of snapping.
      const target = PALETTE[mood()];
      now.glow = towards(now.glow, target.glow, 0.08);
      now.hi = towards(now.hi, target.hi, 0.08);
      now.mid = towards(now.mid, target.mid, 0.08);
      now.lo = towards(now.lo, target.lo, 0.08);
      now.speed += (target.speed - now.speed) * 0.08;
      const W = cv.width;
      const c = W / 2;
      const r = W * 0.2 + Math.sin((t * now.speed) / 900) * 4 + smooth * W * 0.16;
      g.clearRect(0, 0, W, W);
      const glow = g.createRadialGradient(c, c, r * 0.2, c, c, r * 2.1);
      glow.addColorStop(0, rgba(now.glow, 0.35 + smooth * 0.5));
      glow.addColorStop(1, rgba(now.glow, 0));
      g.fillStyle = glow;
      g.fillRect(0, 0, W, W);
      for (let i = 0; i < 3; i++) {
        const rr = r + 18 + i * 22 + Math.sin((t * now.speed) / 500 + i) * smooth * 30;
        g.beginPath();
        g.arc(c, c, rr, 0, Math.PI * 2);
        g.strokeStyle = rgba(now.glow, 0.22 - i * 0.06 + smooth * 0.3);
        g.lineWidth = 2;
        g.stroke();
      }
      const core = g.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r);
      core.addColorStop(0, rgba(now.hi, 1));
      core.addColorStop(0.45, rgba(now.mid, 1));
      core.addColorStop(1, rgba(now.lo, 1));
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.fillStyle = core;
      g.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [level, mood]);

  return <canvas ref={canvas} width={640} height={640} className="h-auto w-[min(340px,60vw)]" />;
}

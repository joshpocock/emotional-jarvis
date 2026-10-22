"use client";
// A glowing orb that breathes when idle and swells with whatever audio level it is given.
import { useEffect, useRef } from "react";

export default function Orb({ level }: { level: () => number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const g = cv.getContext("2d")!;
    let smooth = 0;
    let raf = 0;
    const draw = (t: number) => {
      smooth += (level() - smooth) * 0.18;
      const W = cv.width;
      const c = W / 2;
      const r = W * 0.2 + Math.sin(t / 900) * 4 + smooth * W * 0.16;
      g.clearRect(0, 0, W, W);
      const glow = g.createRadialGradient(c, c, r * 0.2, c, c, r * 2.1);
      glow.addColorStop(0, `rgba(212,176,76,${0.35 + smooth * 0.5})`);
      glow.addColorStop(1, "rgba(212,176,76,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, W, W);
      for (let i = 0; i < 3; i++) {
        const rr = r + 18 + i * 22 + Math.sin(t / 500 + i) * smooth * 30;
        g.beginPath();
        g.arc(c, c, rr, 0, Math.PI * 2);
        g.strokeStyle = `rgba(212,176,76,${0.22 - i * 0.06 + smooth * 0.3})`;
        g.lineWidth = 2;
        g.stroke();
      }
      const core = g.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r);
      core.addColorStop(0, "#fff4cf");
      core.addColorStop(0.45, "#e0bd5a");
      core.addColorStop(1, "#5a4612");
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.fillStyle = core;
      g.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [level]);

  return <canvas ref={canvas} width={640} height={640} className="h-auto w-[min(340px,60vw)]" />;
}

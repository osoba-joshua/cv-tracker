"use client";
import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";

type P = { x: number; y: number; vx: number; vy: number; r: number };

/**
 * A living backdrop for the hero: drifting points joined by faint lines, a soft light that glides after the
 * pointer, and points that gently part around it. Uses the accent hue, so it follows the chosen colour and theme.
 * It is decorative only: paused when off-screen or in a hidden tab, static for reduced motion,
 * lighter on phones, and removable in Settings.
 */
export default function InteractiveBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { settings, dark } = useApp();
  const on = settings.effects !== false;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !on) return;
    const ctx = canvas.getContext("2d");
    const parent = canvas.parentElement;
    if (!ctx || !parent) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, on: false };
    let ps: P[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const readHue = () => getComputedStyle(document.documentElement).getPropertyValue("--hue").trim() || "258";
    let hue = readHue();
    const light = dark ? 72 : 50;

    const resize = () => {
      const r = parent.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(Math.max((w * h) / 15000, 22), w < 640 ? 36 : 84));
      while (ps.length < target) {
        ps.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: Math.random() * 1.4 + 0.8 });
      }
      ps = ps.slice(0, target);
      if (reduce) frame(false);
    };

    const LINK = 118;
    const REACH = 170;

    function frame(animate = true) {
      ctx!.clearRect(0, 0, w, h);
      mouse.sx += (mouse.x - mouse.sx) * 0.12;
      mouse.sy += (mouse.y - mouse.sy) * 0.12;

      if (mouse.on) {
        const g = ctx!.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, 280);
        g.addColorStop(0, `hsl(${hue} 95% ${light}% / ${dark ? 0.2 : 0.13})`);
        g.addColorStop(1, `hsl(${hue} 95% ${light}% / 0)`);
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, w, h);
      }

      if (animate) {
        for (const p of ps) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = w + 10;
          else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          else if (p.y > h + 10) p.y = -10;
          if (mouse.on) {
            const dx = p.x - mouse.sx;
            const dy = p.y - mouse.sy;
            const d = Math.hypot(dx, dy);
            if (d < 150 && d > 0.1) {
              const f = (1 - d / 150) * 0.05;
              p.vx += (dx / d) * f;
              p.vy += (dy / d) * f;
            }
          }
          p.vx *= 0.992;
          p.vy *= 0.992;
          if (Math.hypot(p.vx, p.vy) < 0.06) {
            p.vx += (Math.random() - 0.5) * 0.05;
            p.vy += (Math.random() - 0.5) * 0.05;
          }
        }
      }

      ctx!.lineWidth = 1;
      for (let i = 0; i < ps.length; i++) {
        const a = ps[i];
        for (let j = i + 1; j < ps.length; j++) {
          const b = ps[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx > LINK || dx < -LINK || dy > LINK || dy < -LINK) continue;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx!.strokeStyle = `hsl(${hue} 90% ${light}% / ${(1 - d / LINK) * (dark ? 0.32 : 0.26)})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
        if (mouse.on) {
          const d = Math.hypot(a.x - mouse.sx, a.y - mouse.sy);
          if (d < REACH) {
            ctx!.strokeStyle = `hsl(${hue} 95% ${light}% / ${(1 - d / REACH) * 0.6})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(mouse.sx, mouse.sy);
            ctx!.stroke();
          }
        }
        ctx!.fillStyle = `hsl(${hue} 90% ${light}% / ${dark ? 0.8 : 0.6})`;
        ctx!.beginPath();
        ctx!.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const loop = () => {
      if (visible && !document.hidden) frame();
      raf = requestAnimationFrame(loop);
    };

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      mouse.on = inside;
      if (inside) {
        if (mouse.sx < -1000) {
          mouse.sx = x;
          mouse.sy = y;
        }
        mouse.x = x;
        mouse.y = y;
      }
    };
    const leave = () => {
      mouse.on = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    // Re-read the accent when the user changes it in Settings
    const mo = new MutationObserver(() => {
      hue = readHue();
      if (reduce) frame(false);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-accent"] });

    if (!reduce) {
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerleave", leave);
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [on, dark]);

  if (!on) return null;
  return <canvas ref={ref} className="fx-canvas" aria-hidden />;
}

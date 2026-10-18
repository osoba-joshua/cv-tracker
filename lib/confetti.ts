/** A short burst of confetti for big moments (an offer!). Lightweight canvas, self-cleaning, honours the effects setting. */
export function confetti() {
  if (typeof document === "undefined") return;
  if (document.documentElement.dataset.effects === "off") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const hue = Number(getComputedStyle(document.documentElement).getPropertyValue("--hue")) || 258;
  const palette = [`hsl(${hue} 90% 62%)`, `hsl(${hue + 60} 90% 62%)`, "#fbbf24", "#34d399", "#f472b6", "#ffffff"];
  const N = W < 640 ? 90 : 150;
  const parts = Array.from({ length: N }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const speed = 7 + Math.random() * 9;
    return {
      x: W / 2 + (Math.random() - 0.5) * 80,
      y: H * 0.72,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      s: 5 + Math.random() * 6,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: palette[Math.floor(Math.random() * palette.length)],
      round: Math.random() < 0.3,
    };
  });

  const t0 = performance.now();
  const DURATION = 2600;
  const tick = (t: number) => {
    const age = t - t0;
    ctx.clearRect(0, 0, W, H);
    const fade = age > DURATION - 700 ? Math.max(0, (DURATION - age) / 700) : 1;
    for (const p of parts) {
      p.vy += 0.26;
      p.vx *= 0.992;
      p.vy *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      }
      ctx.restore();
    }
    if (age < DURATION) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

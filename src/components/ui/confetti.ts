const COLORS = ["#ff4775", "#ffd93b", "#6c4dff", "#00b894", "#3aa8ff", "#ff8a3d"];

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  round: boolean;
};

/**
 * A short confetti burst from the bottom of the screen. Draws on a
 * throwaway canvas and removes it when done. Skipped entirely for people
 * who ask for reduced motion.
 */
export function fireConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  ctx.scale(dpr, dpr);

  const pieces: Piece[] = Array.from({ length: Math.min(140, Math.round(w / 6) + 60) }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -Math.PI / 3 : (-2 * Math.PI) / 3) + (Math.random() - 0.5) * 0.9;
    const speed = 9 + Math.random() * 12;
    return {
      x: fromLeft ? w * 0.1 : w * 0.9,
      y: h * 0.95,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 1.35,
      size: 6 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[i % COLORS.length],
      round: i % 5 === 0,
    };
  });

  const start = performance.now();
  const DURATION = 2600;

  function frame(now: number) {
    const t = now - start;
    ctx!.clearRect(0, 0, w, h);
    for (const p of pieces) {
      p.vy += 0.38;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, 1 - Math.max(0, t - DURATION * 0.6) / (DURATION * 0.4));
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      if (p.round) {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx!.restore();
    }
    if (t < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

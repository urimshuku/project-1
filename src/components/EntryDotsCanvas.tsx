/**
 * Entry page: ambient floating dots with subtle mouse response.
 * Canvas-based for performance with 80–120 dots. No scroll, no trails, no glow.
 * Respects prefers-reduced-motion (static dots, no mouse).
 */
import { useEffect, useRef } from 'react';
import { useTheme } from '../lib/theme';

const DOT_COUNT = 100;
const DOT_RADIUS = 1.5; // 2–3px
const FLOAT_AMP = 28;
const MOUSE_RADIUS = 140;
const MOUSE_STRENGTH = 10;
const INFLUENCE_DECAY = 0.92;

interface Dot {
  baseX: number;
  baseY: number;
  periodX: number;
  periodY: number;
  phaseX: number;
  phaseY: number;
  influenceX: number;
  influenceY: number;
}

interface EntryDotsCanvasProps {
  mouse: { x: number; y: number } | null;
  /** Dot opacity multiplier (default 1). Use 0.75 for 25% less opacity on subpages. */
  opacityScale?: number;
  /** Animation speed multiplier (default 1). Use 0.75 for 25% slower on subpages. */
  speedScale?: number;
}

function initDots(): Dot[] {
  const dots: Dot[] = [];
  for (let i = 0; i < DOT_COUNT; i++) {
    dots.push({
      baseX: (i * 0.101 + 0.02) % 0.96,
      baseY: (i * 0.137 + 0.03) % 0.96,
      periodX: 8000 + (i % 8) * 1000,
      periodY: 9000 + (i % 7) * 900,
      phaseX: (i * 0.7) % (Math.PI * 2),
      phaseY: (i * 0.5 + 1) % (Math.PI * 2),
      influenceX: 0,
      influenceY: 0,
    });
  }
  return dots;
}

const DEFAULT_ALPHA = 0.2;

export function EntryDotsCanvas({
  mouse,
  opacityScale = 1,
  speedScale = 1,
}: EntryDotsCanvasProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[] | null>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const mouseRef = useRef(mouse);
  const opacityRef = useRef(opacityScale);
  const speedScaleRef = useRef(speedScale);
  mouseRef.current = mouse;
  opacityRef.current = opacityScale;
  speedScaleRef.current = speedScale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dotRgb = theme === 'dark' ? '212, 212, 216' : '90, 70, 50';
    const baseAlpha = theme === 'dark' ? 0.24 : DEFAULT_ALPHA;
    if (prefersReducedMotion) {
      dotsRef.current = initDots();
      const drawStatic = () => {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const dots = dotsRef.current!;
        ctx.fillStyle = `rgba(${dotRgb}, ${baseAlpha * opacityRef.current})`;
        for (let i = 0; i < dots.length; i++) {
          const d = dots[i];
          const x = d.baseX * w;
          const y = d.baseY * h;
          ctx.beginPath();
          ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      const onResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawStatic();
      };
      onResize();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    if (!dotsRef.current) dotsRef.current = initDots();
    const dots = dotsRef.current;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      const t = (timeRef.current += 16) * 0.001;
      const tScaled = t * speedScaleRef.current;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(${dotRgb}, ${baseAlpha * opacityRef.current})`;

      const m = mouseRef.current;
      const mx = m?.x ?? -9999;
      const my = m?.y ?? -9999;

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const freqX = (2 * Math.PI) / (d.periodX / 1000);
        const freqY = (2 * Math.PI) / (d.periodY / 1000);
        let x = d.baseX * w + FLOAT_AMP * Math.sin(tScaled * freqX + d.phaseX);
        let y = d.baseY * h + FLOAT_AMP * Math.cos(tScaled * freqY + d.phaseY);

        if (m) {
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            const f = (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH;
            const nx = dx / dist;
            const ny = dy / dist;
            d.influenceX += nx * f;
            d.influenceY += ny * f;
          }
        }
        d.influenceX *= INFLUENCE_DECAY;
        d.influenceY *= INFLUENCE_DECAY;
        x += d.influenceX;
        y += d.influenceY;

        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', setSize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="entry-dots-canvas"
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}

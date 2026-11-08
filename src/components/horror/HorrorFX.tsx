'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const NOISE_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>";

const FOG_LAYER =
  'radial-gradient(40% 60% at 20% 60%, rgba(120,110,110,0.35), transparent 70%),' +
  'radial-gradient(35% 50% at 55% 70%, rgba(110,90,90,0.30), transparent 70%),' +
  'radial-gradient(45% 55% at 85% 55%, rgba(120,100,100,0.32), transparent 70%)';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Rising embers and ash, drawn on one canvas. */
function Embers() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const count = w < 640 ? 22 : 46;
    type P = { x: number; y: number; vy: number; r: number; phase: number; amp: number; life: number; ash: boolean };
    const spawn = (initial = false): P => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      vy: 0.15 + Math.random() * 0.55,
      r: 0.6 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      amp: 0.2 + Math.random() * 0.8,
      life: Math.random(),
      ash: Math.random() < 0.3,
    });
    const ps: P[] = Array.from({ length: count }, () => spawn(true));

    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.y -= p.vy;
        p.x += Math.sin(t * 0.8 + p.phase) * p.amp * 0.4;
        p.life += 0.002;
        if (p.y < -10) ps[i] = spawn();
        const flick = 0.55 + 0.45 * Math.sin(t * 6 + p.phase * 3);
        const fade = Math.min(1, (h - p.y) / 200) * Math.min(1, p.y / 120);
        const a = Math.max(0, fade * flick);
        if (p.ash) {
          ctx.fillStyle = `rgba(180,160,150,${a * 0.25})`;
          ctx.fillRect(p.x, p.y, p.r * 1.4, p.r * 0.7);
        } else {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, `rgba(255,${120 + Math.floor(flick * 60)},60,${a * 0.9})`);
          g.addColorStop(0.4, `rgba(220,30,20,${a * 0.35})`);
          g.addColorStop(1, 'rgba(120,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 w-full h-full" />;
}

/** A tall figure that crosses the bottom of the screen now and then. */
function Figure() {
  return (
    <svg viewBox="0 0 120 400" className="h-full w-auto" fill="#000">
      <ellipse cx="60" cy="38" rx="17" ry="22" />
      <path d="M60 58 C 30 66, 22 92, 20 140 L 14 290 C 13 330, 20 380, 24 400 L 44 400 L 52 250 L 56 400 L 68 400 L 70 250 L 78 400 L 98 400 C 102 370, 108 330, 104 290 L 100 140 C 98 92, 90 66, 60 58 Z" />
      <path d="M22 130 C 10 200, 6 260, 2 330 L 8 332 C 16 270, 22 210, 30 150 Z" />
      <path d="M98 130 C 110 200, 114 260, 118 330 L 112 332 C 104 270, 98 210, 90 150 Z" />
    </svg>
  );
}

/**
 * Site-wide atmosphere: grain, vignette, scanlines, fog, embers,
 * random power cuts and lightning, a passing figure, and a glitch between pages.
 * Everything is pointer-events-none and sits under the navbar.
 */
export function HorrorFX() {
  const reduced = usePrefersReducedMotion();
  const pathname = usePathname();
  const [flickerKey, setFlickerKey] = useState(0);
  const [lightningKey, setLightningKey] = useState(0);
  const [ghostKey, setGhostKey] = useState(0);
  const [routeKey, setRouteKey] = useState(0);
  const prevPath = useRef(pathname);

  // Random power cuts
  useEffect(() => {
    if (reduced) return;
    let to: ReturnType<typeof setTimeout>;
    const schedule = () => {
      to = setTimeout(() => {
        setFlickerKey((k) => k + 1);
        schedule();
      }, 16000 + Math.random() * 22000);
    };
    schedule();
    return () => clearTimeout(to);
  }, [reduced]);

  // Lightning, a little more often
  useEffect(() => {
    if (reduced) return;
    let to: ReturnType<typeof setTimeout>;
    const schedule = () => {
      to = setTimeout(() => {
        setLightningKey((k) => k + 1);
        schedule();
      }, 9000 + Math.random() * 14000);
    };
    schedule();
    return () => clearTimeout(to);
  }, [reduced]);

  // The figure
  useEffect(() => {
    if (reduced) return;
    let to: ReturnType<typeof setTimeout>;
    const schedule = (first = false) => {
      to = setTimeout(() => {
        setGhostKey((k) => k + 1);
        schedule();
      }, first ? 7000 + Math.random() * 5000 : 38000 + Math.random() * 35000);
    };
    schedule(true);
    return () => clearTimeout(to);
  }, [reduced]);

  // Glitch cut between pages
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setRouteKey((k) => k + 1);
  }, [pathname]);

  return (
    <div aria-hidden className="pointer-events-none">
      {/* Embers sit behind the fog but above the page */}
      {!reduced && (
        <div className="horror-motion fixed inset-0 z-[41] opacity-70">
          <Embers />
        </div>
      )}

      {/* Ground fog */}
      <div className="horror-motion fixed inset-x-0 bottom-0 h-[45vh] z-[42] overflow-hidden opacity-60 mix-blend-screen">
        <div
          className="absolute -inset-x-[20%] inset-y-0 blur-2xl"
          style={{ background: FOG_LAYER, animation: 'fog-drift 38s ease-in-out infinite alternate' }}
        />
        <div
          className="absolute -inset-x-[20%] inset-y-0 blur-3xl opacity-70"
          style={{ background: FOG_LAYER, animation: 'fog-drift-rev 52s ease-in-out infinite alternate' }}
        />
      </div>

      {/* The figure */}
      {ghostKey > 0 && !reduced && (
        <div
          key={`g${ghostKey}`}
          className="horror-motion fixed bottom-0 left-0 z-[43] h-[58vh] opacity-0 blur-[1.5px] mix-blend-multiply"
          style={{ animation: 'ghost-walk 11s linear forwards' }}
        >
          <div className="h-full opacity-60">
            <Figure />
          </div>
        </div>
      )}

      {/* Vignette */}
      <div
        className="fixed inset-0 z-[44]"
        style={{
          background:
            'radial-gradient(ellipse 85% 75% at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.9) 100%)',
        }}
      />

      {/* Scanlines */}
      <div
        className="fixed inset-0 z-[44] opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Film grain */}
      <div className="fixed inset-0 z-[45] overflow-hidden opacity-[0.07] mix-blend-overlay">
        <div
          className="absolute -inset-[50%] w-[200%] h-[200%]"
          style={{
            backgroundImage: `url("${NOISE_SVG}")`,
            animation: reduced ? undefined : 'grain 0.9s steps(6) infinite',
          }}
        />
      </div>

      {/* Lightning */}
      {lightningKey > 0 && (
        <div
          key={`l${lightningKey}`}
          className="horror-motion fixed inset-0 z-[46] bg-[#dfe6ff] opacity-0 mix-blend-overlay"
          style={{ animation: 'lightning 1.6s ease-out forwards' }}
        />
      )}

      {/* Power cut */}
      {flickerKey > 0 && (
        <div
          key={`f${flickerKey}`}
          className="horror-motion fixed inset-0 z-[46] bg-black opacity-0"
          style={{ animation: 'power-flicker 1.1s steps(1) forwards' }}
        />
      )}

      {/* Between pages */}
      {routeKey > 0 && (
        <div
          key={`r${routeKey}`}
          className="horror-motion fixed inset-0 z-[70] bg-black"
          style={{ animation: 'route-glitch 0.55s steps(1) forwards' }}
        >
          <div
            className="absolute inset-x-0 top-1/2 h-[2px] bg-brand-red-light shadow-[0_0_20px_rgba(255,40,50,0.9)]"
            style={{ transform: 'translateY(-50%)' }}
          />
        </div>
      )}
    </div>
  );
}

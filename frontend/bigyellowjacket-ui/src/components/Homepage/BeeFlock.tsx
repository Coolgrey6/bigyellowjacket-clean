import React, { useEffect, useRef } from 'react';

interface Bee {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface BeeFlockProps {
  count?: number;
}

// Lightweight boids with mouse attraction
export const BeeFlock: React.FC<BeeFlockProps> = ({ count = 10 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beesRef = useRef<Bee[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef<boolean>(false);
  const repelUntilRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * DPR);
      canvas.height = Math.floor(rect.height * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();

    // Init bees
    const rect = canvas.getBoundingClientRect();
    const bees: Bee[] = Array.from({ length: count }).map(() => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
    }));
    beesRef.current = bees;

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
      mouseRef.current.active = true;
    };
    const onLeave = () => { mouseRef.current.active = false; };
    const onClick = (e: MouseEvent) => {
      // Click anywhere: scatter and enable temporary repulsion from cursor
      const r = canvas.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const bees = beesRef.current;
      // Strong scatter impulse for all bees
      for (let i = 0; i < bees.length; i++) {
        const b = bees[i];
        const dx = b.x - cx;
        const dy = b.y - cy;
        const d = Math.sqrt(dx*dx + dy*dy) + 0.0001;
        const strength = 10 + Math.random() * 8; // 10-18 impulse
        b.vx += (dx / d) * strength;
        b.vy += (dy / d) * strength;
      }
      // Set repulsion window (ms)
      repelUntilRef.current = Date.now() + 1500;
    };
    const onMouseDown = (e: MouseEvent) => {
      // Keep mouse active state immediate for attraction while held
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
      mouseRef.current.active = true;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', resize);

    const params = {
      maxSpeed: 2.0,
      separationDist: 24,
      alignmentDist: 60,
      cohesionDist: 80,
      separationFactor: 0.045,
      alignmentFactor: 0.02,
      cohesionFactor: 0.01,
      mouseAttractFactor: 0.06,
      mouseRadius: 9999,
      boundaryPadding: 20,
    };

    const step = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);

      const bees = beesRef.current;
      const mouse = mouseRef.current;

      const paused = pausedRef.current;
      // Draw-only mode if paused
      if (paused) {
        for (let i = 0; i < bees.length; i++) {
          const b = bees[i];
          ctx.save();
          ctx.font = '20px system-ui, Apple Color Emoji, Segoe UI Emoji';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🐝', b.x, b.y);
          ctx.restore();
        }
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      for (let i = 0; i < bees.length; i++) {
        const b = bees[i];
        let sepX = 0, sepY = 0;
        let aliX = 0, aliY = 0, aliN = 0;
        let cohX = 0, cohY = 0, cohN = 0;

        for (let j = 0; j < bees.length; j++) {
          if (i === j) continue;
          const o = bees[j];
          const dx = o.x - b.x;
          const dy = o.y - b.y;
          const d2 = dx*dx + dy*dy;

          if (d2 < params.separationDist * params.separationDist && d2 > 0.0001) {
            const inv = 1 / Math.sqrt(d2);
            sepX -= dx * inv;
            sepY -= dy * inv;
          }

          if (d2 < params.alignmentDist * params.alignmentDist) {
            aliX += o.vx;
            aliY += o.vy;
            aliN++;
          }

          if (d2 < params.cohesionDist * params.cohesionDist) {
            cohX += o.x;
            cohY += o.y;
            cohN++;
          }
        }

        // Apply flocking rules
        b.vx += sepX * params.separationFactor;
        b.vy += sepY * params.separationFactor;

        if (aliN > 0) {
          b.vx += ((aliX / aliN) - b.vx) * params.alignmentFactor;
          b.vy += ((aliY / aliN) - b.vy) * params.alignmentFactor;
        }

        if (cohN > 0) {
          b.vx += ((cohX / cohN) - b.x) * params.cohesionFactor;
          b.vy += ((cohY / cohN) - b.y) * params.cohesionFactor;
        }

        // Mouse interaction: attraction or temporary repulsion after click
        if (mouse.active) {
          const dx = mouse.x - b.x;
          const dy = mouse.y - b.y;
          const d = Math.sqrt(dx*dx + dy*dy) + 0.0001;
          const repelActive = Date.now() < repelUntilRef.current;
          const factor = repelActive ? -params.mouseAttractFactor * 1.2 : params.mouseAttractFactor;
          b.vx += (dx / d) * factor;
          b.vy += (dy / d) * factor;
        }

        // Limit speed
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > params.maxSpeed) {
          b.vx = (b.vx / speed) * params.maxSpeed;
          b.vy = (b.vy / speed) * params.maxSpeed;
        }

        // Move
        b.x += b.vx;
        b.y += b.vy;

        // Soft boundaries
        if (b.x < params.boundaryPadding) b.vx += 0.05;
        if (b.x > width - params.boundaryPadding) b.vx -= 0.05;
        if (b.y < params.boundaryPadding) b.vy += 0.05;
        if (b.y > height - params.boundaryPadding) b.vy -= 0.05;

        // Draw bee (emoji text for performance simplicity)
        ctx.save();
        ctx.font = '20px system-ui, Apple Color Emoji, Segoe UI Emoji';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐝', b.x, b.y);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousedown', onMouseDown);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 2
      }}
      aria-hidden
    />
  );
};

export default BeeFlock;


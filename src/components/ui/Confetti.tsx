import { useEffect, useRef } from 'react';

const COLORS = ['#E8141C', '#2563EB', '#16A34A', '#CA8A04', '#9333EA', '#0891B2', '#F59E0B', '#EC4899'];
const COUNT = 80;

export function Confetti() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const left = Math.random() * 100;
      const duration = 2.2 + Math.random() * 2;
      const delay = Math.random() * 1.2;
      const size = 6 + Math.random() * 8;
      const swayDur = 1.5 + Math.random() * 1.5;
      Object.assign(el.style, {
        left: `${left}vw`,
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        animationDuration: `${duration}s, ${swayDur}s`,
        animationDelay: `${delay}s, ${delay}s`,
      });
      container.appendChild(el);
    }

    const cleanup = setTimeout(() => { if (container) container.innerHTML = ''; }, 5000);
    return () => clearTimeout(cleanup);
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000 }} />;
}

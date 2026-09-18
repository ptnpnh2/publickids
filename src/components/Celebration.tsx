import { useEffect } from 'react';
import type { CelebrationStyle } from '@/domain/types';

/** Brief, skippable, under two seconds for routine feedback; never blocks leaving. */
export function Celebration({ style, text, onDone, soundOff }: { style: CelebrationStyle; text: string; onDone: () => void; soundOff?: boolean }) {
  useEffect(() => {
    const t = setTimeout(onDone, style === 'big' ? 2200 : style === 'fun' ? 1600 : 900);
    if (!soundOff && style !== 'quiet') beep();
    return () => clearTimeout(t);
  }, [style, onDone, soundOff]);
  const pieces = style === 'big' ? 40 : style === 'fun' ? 14 : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" aria-live="polite">
      {Array.from({ length: pieces }, (_, i) => (
        <span key={i} className="confetti" style={{ left: `${(i * 37) % 100}%`, background: ['#f59e0b', '#2563eb', '#16a34a', '#ec4899'][i % 4], animationDelay: `${(i % 5) * 0.1}s` }} />
      ))}
      <div className="card pop text-center shadow-xl pointer-events-auto" onClick={onDone}>
        <div className="text-4xl">{style === 'quiet' ? '✓' : '🎉'}</div>
        <p className="font-bold mt-1">{text}</p>
      </div>
    </div>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    g.gain.value = 0.05;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.15);
    o.stop(ctx.currentTime + 0.2);
  } catch {
    /* no audio */
  }
}

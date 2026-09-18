import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function Button({ variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'accent' }) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}

export function Card({ children, className = '', onClick, flat }: { children: ReactNode; className?: string; onClick?: () => void; flat?: boolean }) {
  return (
    <div className={`card ${flat ? 'card-flat' : ''} ${className}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  );
}

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <h1 className="page-title">{children}</h1>
      {right}
    </div>
  );
}

export function Section({ title, emoji, children, right }: { title: string; emoji?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="section-title">
          {emoji && <span aria-hidden>{emoji}</span>}
          {title}
        </h2>
        {right}
      </div>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block mb-3">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="muted text-xs block mt-1">{hint}</span>}
    </label>
  );
}

export function Progress({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`progress ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Circular progress used for goals and quests. */
export function Ring({ value, max, size = 64, label, stroke = 'currentColor' }: { value: number; max: number; size?: number; label?: ReactNode; stroke?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeOpacity={0.18} strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth={7} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div className="absolute text-xs font-extrabold text-center leading-tight">{label ?? `${Math.round(pct * 100)}%`}</div>
    </div>
  );
}

export function Stat({ label, value, emoji }: { label: string; value: ReactNode; emoji?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-bold uppercase tracking-wide muted">{label}</span>
      <span className="display text-2xl font-extrabold">
        {emoji && <span aria-hidden>{emoji} </span>}
        {value}
      </span>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-2" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[90dvh] overflow-y-auto pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        {title && <h2 className="text-lg font-extrabold mb-3">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ text, emoji = '🌤️' }: { text: string; emoji?: string }) {
  return (
    <div className="text-center py-10 muted">
      <div className="text-5xl mb-2" aria-hidden>
        {emoji}
      </div>
      <p className="font-semibold">{text}</p>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 card pop text-sm font-semibold" role="status">
      {message}
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  return { message, show: setMessage, clear: () => setMessage(null) };
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-full p-1" style={{ background: 'var(--bg-2)' }} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className="flex-1 rounded-full px-3 text-sm font-bold transition" style={{ minHeight: 'calc(var(--target) - 12px)', background: value === o.value ? 'var(--card)' : 'transparent', color: value === o.value ? 'var(--primary)' : 'var(--muted)', boxShadow: value === o.value ? 'var(--shadow)' : 'none' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2" style={{ minHeight: 'var(--target)' }}>
      <span className="font-semibold">{label}</span>
      <span className="relative inline-block w-12 h-7 rounded-full transition" style={{ background: checked ? 'var(--primary)' : 'var(--border)' }}>
        <input type="checkbox" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all" style={{ left: checked ? 26 : 4 }} />
      </span>
    </label>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <p className="text-sm mt-2 status-warn font-semibold" role="alert">
      {t(error, { defaultValue: error })}
    </p>
  );
}

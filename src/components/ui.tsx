import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function Button({ variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`card ${className}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
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

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-2" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[90dvh] overflow-y-auto pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        {title && <h2 className="text-lg font-bold mb-3">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ text, emoji = '🌤️' }: { text: string; emoji?: string }) {
  return (
    <div className="text-center py-10 muted">
      <div className="text-4xl mb-2">{emoji}</div>
      <p>{text}</p>
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
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 card shadow-lg pop text-sm" role="status">
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
    <div className="flex gap-1 rounded-full p-1 border" style={{ borderColor: 'var(--border)' }} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={`flex-1 rounded-full px-3 text-sm font-semibold`} style={{ minHeight: 'calc(var(--target) - 10px)', background: value === o.value ? 'var(--primary)' : 'transparent', color: value === o.value ? 'var(--primary-contrast)' : 'var(--text)' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2" style={{ minHeight: 'var(--target)' }}>
      <span>{label}</span>
      <input type="checkbox" className="w-6 h-6" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <p className="text-sm mt-2" style={{ color: 'var(--warn)' }} role="alert">
      {t(error, { defaultValue: error })}
    </p>
  );
}

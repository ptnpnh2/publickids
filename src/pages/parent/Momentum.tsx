import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChildren, useFamily, useMe } from '@/hooks/useData';
import { Button, Card, ErrorText, Field, Modal, Toggle } from '@/components/ui';
import { forecastWeeklyBonus, validateMomentumConfig } from '@/domain/momentum';
import { publishMomentumConfig, reviewMomentum } from '@/services/momentum';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import type { MomentumConfig } from '@/domain/types';

/** Supervisor configuration of Consistency Boost (§1.9): preview, warnings, forecast, confirmation. */
export default function Momentum() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const states = useLiveQuery(() => (family ? db.momentum.where('familyId').equals(family.id).toArray() : []), [family?.id]) ?? [];
  const [cfg, setCfg] = useState<MomentumConfig | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typical, setTypical] = useState(40);
  useEffect(() => { if (family && !cfg) setCfg(structuredClone(family.momentum)); }, [family, cfg]);
  if (!family || !me || !cfg) return null;
  const warnings = validateMomentumConfig(cfg);
  const forecast = forecastWeeklyBonus(cfg, typical);
  const canEdit = me.isSupervisor;

  async function publish() {
    if (!me || !family || !cfg) return;
    setError(null);
    try {
      await publishMomentumConfig(me.id, family.id, cfg, confirmed);
      setConfirmOpen(false);
      setConfirmed(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">{t('momentum.title')}</h1>
      <p className="muted text-sm">{t('momentum.parentExplain')}</p>
      {!canEdit && <p className="chip">{t('momentum.supervisorOnly')}</p>}
      <Card>
        <h2 className="font-bold mb-2">{t('momentum.children')}</h2>
        {kids.map((k) => {
          const st = states.find((s) => s.childId === k.id);
          const level = cfg.levels.find((l) => l.key === st?.levelKey) ?? cfg.levels[0];
          return (
            <div key={k.id} className="flex items-center gap-2 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xl">{k.child?.avatar.emoji}</span>
              <span className="flex-1">
                <span className="font-semibold block">{k.name} · {level.name} (×{level.coefficient.toFixed(2)})</span>
                {st?.candidateLowerKey && <span className="muted text-xs">{t('momentum.reviewDue', { level: cfg.levels.find((l) => l.key === st.candidateLowerKey)?.name })}</span>}
                {st?.pausedForReview && <span className="chip">{t('momentum.paused')}</span>}
              </span>
              {st?.candidateLowerKey && (
                <>
                  <Button variant="secondary" className="text-xs" onClick={() => reviewMomentum(me.id, k.id, false)}>{t('momentum.keep')}</Button>
                  <Button variant="ghost" className="text-xs" onClick={() => reviewMomentum(me.id, k.id, true)}>{t('momentum.lower')}</Button>
                </>
              )}
            </div>
          );
        })}
      </Card>
      <Card>
        <h2 className="font-bold mb-2">{t('momentum.levels')}</h2>
        <div className="grid gap-3">
          {cfg.levels.map((l, i) => (
            <div key={l.key} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
              <Field label={t('momentum.name')}><input className="input" disabled={!canEdit} value={l.name} onChange={(e) => setCfg({ ...cfg, levels: cfg.levels.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} /></Field>
              <Field label={t('momentum.coefficient')}><input className="input" disabled={!canEdit} type="number" step={0.01} min={0.5} max={2} value={l.coefficient} onChange={(e) => setCfg({ ...cfg, levels: cfg.levels.map((x, j) => (j === i ? { ...x, coefficient: Number(e.target.value) } : x)) })} /></Field>
              <Field label={t('momentum.minPct')}><input className="input" disabled={!canEdit || i === 0} type="number" min={0} max={100} value={l.minPct} onChange={(e) => setCfg({ ...cfg, levels: cfg.levels.map((x, j) => (j === i ? { ...x, minPct: Number(e.target.value) } : x)) })} /></Field>
              <Field label={t('momentum.windowDays')}><input className="input" disabled={!canEdit || i === 0} type="number" min={0} max={90} value={l.windowDays} onChange={(e) => setCfg({ ...cfg, levels: cfg.levels.map((x, j) => (j === i ? { ...x, windowDays: Number(e.target.value) } : x)) })} /></Field>
            </div>
          ))}
        </div>
        <Field label={t('momentum.cap')} hint={t('momentum.capHint')}><input className="input" disabled={!canEdit} type="number" min={0} max={100} value={cfg.weeklyCapPct} onChange={(e) => setCfg({ ...cfg, weeklyCapPct: Number(e.target.value) })} /></Field>
        <Field label={t('momentum.grace')}><input className="input" disabled={!canEdit} type="number" min={0} max={60} value={cfg.gracePeriodDays} onChange={(e) => setCfg({ ...cfg, gracePeriodDays: Number(e.target.value) })} /></Field>
        {warnings.map((w, i) => (
          <p key={i} className="text-sm" style={{ color: 'var(--warn)' }}>⚠️ {t(`momentum.warn.${w.kind}`, { level: w.levelKey, value: w.value })}</p>
        ))}
        <h3 className="font-bold mt-3">{t('momentum.forecast')}</h3>
        <Field label={t('momentum.typicalPoints')}><input className="input" type="number" min={0} value={typical} onChange={(e) => setTypical(Number(e.target.value))} /></Field>
        <ul className="text-sm">
          {forecast.map((f) => (
            <li key={f.key}>{cfg.levels.find((l) => l.key === f.key)?.name}: +{f.bonus} {t('common.pts')}/{t('common.week')}</li>
          ))}
        </ul>
        {canEdit && (
          <div className="flex gap-2 mt-3">
            <Button onClick={() => (warnings.length ? setConfirmOpen(true) : publish())}>{t('momentum.publish')}</Button>
            <Button variant="secondary" onClick={() => setCfg(structuredClone(family.momentum))}>{t('common.reset')}</Button>
          </div>
        )}
        <ErrorText error={error} />
        <p className="muted text-xs mt-2">{t('momentum.version', { v: family.momentum.version })}</p>
      </Card>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('momentum.confirmTitle')}>
        <p className="text-sm">{t('momentum.riskWarning')}</p>
        <Toggle label={t('momentum.confirmToggle')} checked={confirmed} onChange={setConfirmed} />
        <Button className="w-full mt-2" disabled={!confirmed} onClick={publish}>{t('momentum.publish')}</Button>
      </Modal>
    </div>
  );
}

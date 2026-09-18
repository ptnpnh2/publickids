import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgreement, useChildren, useFamily, useIncidents, useMe, useSubmissions } from '@/hooks/useData';
import { Button, Card, ErrorText, Field, Modal, Toggle } from '@/components/ui';
import { advanceIncident, applyResponseCost, openIncident, undoIncident } from '@/services/incidents';
import { CAUSE_OPTIONS, INCIDENT_FLOW, coolingOffOver, correctionHeavy } from '@/domain/consequences';
import { weekStart } from '@/domain/time';
import type { Incident } from '@/domain/types';

/** Pause → Understand → Repair → Support → Close. Point loss off by default. Never by nanny or AI. */
export default function Repair() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const incidents = useIncidents();
  const subs = useSubmissions();
  const agreement = useAgreement();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ childId: '', description: '', ruleId: '', safetyRule: false });
  const [error, setError] = useState<string | null>(null);
  const isParent = me?.role === 'parent' || me?.role === 'coparent';
  const ws = weekStart(new Date());
  const weekIncidents = incidents.filter((i) => i.createdAt >= ws && !i.undoneAt).length;
  const weekApprovals = subs.filter((s) => s.dateKey >= ws && s.status === 'approved').length;
  const heavy = correctionHeavy(weekIncidents, weekApprovals);
  const active = incidents.filter((i) => i.status !== 'closed').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const closed = incidents.filter((i) => i.status === 'closed').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t('repair.title')}</h1>
        {isParent && <Button onClick={() => { setForm({ childId: kids[0]?.id ?? '', description: '', ruleId: '', safetyRule: false }); setOpen(true); }}>＋ {t('repair.open')}</Button>}
      </div>
      <p className="muted text-sm">{t('repair.explain')}</p>
      {heavy && <Card>🧭 {t('repair.coaching')}</Card>}
      {!isParent && <p className="chip">{t('repair.parentOnly')}</p>}
      {active.map((i) => <IncidentCard key={i.id} incident={i} />)}
      {closed.length > 0 && <h2 className="font-bold muted text-sm uppercase">{t('repair.closed')}</h2>}
      {closed.map((i) => (
        <Card key={i.id} className="text-sm muted">
          {kids.find((k) => k.id === i.childId)?.name}: {i.description} {i.undoneAt ? `· ${t('repair.undone')}` : ''}
        </Card>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title={t('repair.open')}>
        <Field label={t('common.child')}>
          <select className="input" value={form.childId} onChange={(e) => setForm({ ...form, childId: e.target.value })}>{kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
        </Field>
        <Field label={t('repair.rule')}>
          <select className="input" value={form.ruleId} onChange={(e) => setForm({ ...form, ruleId: e.target.value })}>
            <option value="">—</option>
            {agreement?.rules.map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}
          </select>
        </Field>
        <Field label={t('repair.whatHappened')}><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Toggle label={t('repair.safetyRule')} checked={form.safetyRule} onChange={(safetyRule) => setForm({ ...form, safetyRule })} />
        <p className="muted text-xs mb-2">{t('repair.coolingNote', { min: family?.settings.coolingOffMinutes })}</p>
        <ErrorText error={error} />
        <Button className="w-full" disabled={!form.description.trim() || !form.childId} onClick={async () => { if (!me || !family) return; try { await openIncident(me.id, { familyId: family.id, childId: form.childId, description: form.description, ruleId: form.ruleId || undefined, safetyRule: form.safetyRule }); setOpen(false); } catch (e) { setError((e as Error).message); } }}>
          {t('repair.startPause')}
        </Button>
      </Modal>
    </div>
  );
}

function IncidentCard({ incident: i }: { incident: Incident }) {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const agreement = useAgreement();
  const [causes, setCauses] = useState<string[]>(i.causes);
  const [text, setText] = useState('');
  const [privilege, setPrivilege] = useState(agreement?.rules.find((r) => r.id === i.ruleId)?.relatedPrivilege ?? '');
  const [hours, setHours] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const isParent = me?.role === 'parent' || me?.role === 'coparent';
  const kid = kids.find((k) => k.id === i.childId);
  const idx = INCIDENT_FLOW.indexOf(i.status);
  const cooling = !coolingOffOver(i);

  async function next() {
    if (!me) return;
    setError(null);
    const patch: Partial<Incident> = {};
    if (i.status === 'understand') patch.causes = causes;
    if (i.status === 'repair') patch.repairPlan = text;
    if (i.status === 'support') patch.support = text;
    if (i.status === 'pause') patch.childExplanation = text;
    try {
      await advanceIncident(me.id, i.id, patch);
      setText('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="text-xl">{kid?.child?.avatar.emoji}</span>
        <span className="flex-1 font-bold">{kid?.name}: {i.description}</span>
        {isParent && <Button variant="ghost" className="text-xs" onClick={() => me && undoIncident(me.id, i.id)}>↶ {t('common.undo')}</Button>}
      </div>
      <div className="flex gap-1 my-2">
        {INCIDENT_FLOW.map((s, j) => <span key={s} className="chip" style={{ opacity: j <= idx ? 1 : 0.4 }}>{t(`incident.step.${s}`)}</span>)}
      </div>
      <p className="muted text-xs">{t(`incident.explain.${i.status}`)}</p>
      {i.appeal?.status === 'open' && <p className="chip mt-1">{t('repair.appealOpen')}</p>}
      {isParent && (
        <div className="mt-2">
          {i.status === 'pause' && (
            <>
              {cooling && <p className="text-sm">⏳ {t('repair.coolingUntil', { time: new Date(i.coolingOffUntil).toLocaleTimeString() })}</p>}
              <Field label={t('repair.childExplanation')}><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('repair.childExplanationPlaceholder')} /></Field>
            </>
          )}
          {i.status === 'understand' && (
            <Field label={t('repair.causes')}>
              <div className="flex flex-wrap gap-1">
                {CAUSE_OPTIONS.map((c) => (
                  <button key={c} type="button" className={`btn text-xs ${causes.includes(c) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCauses(causes.includes(c) ? causes.filter((x) => x !== c) : [...causes, c])}>{t(`cause.${c}`)}</button>
                ))}
              </div>
            </Field>
          )}
          {i.status === 'repair' && (
            <>
              <Field label={t('repair.plan')} hint={t('repair.planHint')}><input className="input" value={text} onChange={(e) => setText(e.target.value)} /></Field>
              {family?.settings.responseCostEnabled && (
                <details className="text-sm mb-2">
                  <summary className="cursor-pointer muted">{t('repair.responseCost')}</summary>
                  <p className="muted text-xs my-1">{t('settings.responseCostHint')}</p>
                  <div className="flex gap-2">
                    <input className="input" placeholder={t('repair.privilege')} value={privilege} onChange={(e) => setPrivilege(e.target.value)} />
                    <input className="input w-24" type="number" min={1} max={48} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
                    <Button variant="secondary" onClick={async () => { if (!me) return; try { await applyResponseCost(me.id, i.id, privilege, hours); } catch (e) { setError((e as Error).message); } }}>{t('common.apply')}</Button>
                  </div>
                </details>
              )}
              {i.responseCost && <p className="text-xs">⏸ {i.responseCost.privilege} → {new Date(i.responseCost.until).toLocaleString()}</p>}
            </>
          )}
          {i.status === 'support' && <Field label={t('repair.support')} hint={t('repair.supportHint')}><input className="input" value={text} onChange={(e) => setText(e.target.value)} /></Field>}
          <ErrorText error={error} />
          <Button className="mt-1" disabled={i.status === 'pause' && cooling} onClick={next}>
            {i.status === 'support' ? `✓ ${t('incident.step.closed')}` : `${t('common.next')}: ${t(`incident.step.${INCIDENT_FLOW[idx + 1]}`)}`}
          </Button>
        </div>
      )}
    </Card>
  );
}

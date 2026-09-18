import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBalance, useCoop, useFamily, useGoals, useLedger, useMe } from '@/hooks/useData';
import { Button, Card, Modal, Progress } from '@/components/ui';
import { Celebration } from '@/components/Celebration';
import { createGoal, saveToGoal } from '@/services/rewards';
import { weeksToGoal } from '@/domain/economy';

export default function GoalPage() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const goals = useGoals(me?.id);
  const balance = useBalance(me?.id);
  const ledger = useLedger(me?.id);
  const coop = useCoop();
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposal, setProposal] = useState({ title: '', emoji: '🎯', target: 40 });
  const active = goals.filter((g) => g.status === 'active').sort((a, b) => Number(b.primary) - Number(a.primary));
  const reached = goals.filter((g) => g.status === 'reached');
  const proposed = goals.filter((g) => g.status === 'proposed');

  const fourWeeksAgo = new Date(Date.now() - 28 * 86_400_000).toISOString();
  const avgWeekly = ledger.filter((e) => e.kind === 'earn' && e.createdAt >= fourWeeksAgo).reduce((s, e) => s + e.amount, 0) / 4;

  async function save(goalId: string, amount: number) {
    if (!me) return;
    const crossed = await saveToGoal(me.id, goalId, amount);
    if (crossed.length) setCelebrate(t('goal.milestone', { pct: crossed[crossed.length - 1] }));
  }

  return (
    <div className="space-y-4">
      {celebrate && <Celebration style={me?.child?.celebration ?? 'fun'} soundOff={me?.child?.soundOff} text={celebrate} onDone={() => setCelebrate(null)} />}
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t('nav.goal')}</h1>
        <div className="chip text-base">⭐ {balance}</div>
      </div>
      {active.length === 0 && <p className="muted text-center py-6">{t('goal.none')}</p>}
      {active.map((g) => {
        const remaining = g.targetPoints - g.savedPoints;
        const weeks = weeksToGoal(remaining, avgWeekly);
        return (
          <Card key={g.id}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{g.emoji}</span>
              <div className="flex-1">
                <h2 className="font-bold text-lg">{g.title}</h2>
                <p className="muted text-sm">
                  {g.savedPoints} / {g.targetPoints} ⭐ {g.primary ? `· ${t('goal.primary')}` : ''}
                </p>
              </div>
            </div>
            <Progress value={g.savedPoints} max={g.targetPoints} className="my-3" />
            <div className="flex gap-2 text-xs muted mb-3">
              {[25, 50, 75, 100].map((m) => (
                <span key={m} className="chip" style={{ opacity: g.milestones.includes(m) ? 1 : 0.4 }}>
                  {m}% {g.milestones.includes(m) ? '✓' : ''}
                </span>
              ))}
            </div>
            {weeks !== null && remaining > 0 && <p className="muted text-sm mb-2">{t('goal.estimate', { weeks })}</p>}
            <div className="flex gap-2">
              {[1, 5].map((n) => (
                <Button key={n} variant="secondary" disabled={balance < n || remaining <= 0} onClick={() => save(g.id, n)}>
                  +{n} ⭐
                </Button>
              ))}
              <Button disabled={balance <= 0 || remaining <= 0} onClick={() => save(g.id, Math.min(balance, remaining))}>
                {t('goal.saveAll')}
              </Button>
            </div>
          </Card>
        );
      })}
      {reached.map((g) => (
        <Card key={g.id} className="flex items-center gap-3">
          <span className="text-3xl">{g.emoji}</span>
          <span className="flex-1 font-bold">{g.title}</span>
          <span className="chip">🏁 {t('goal.reached')}</span>
        </Card>
      ))}
      {proposed.map((g) => (
        <Card key={g.id} className="flex items-center gap-3">
          <span className="text-3xl">{g.emoji}</span>
          <span className="flex-1">{g.title}</span>
          <span className="chip">{t('goal.waitingApproval')}</span>
        </Card>
      ))}
      {coop && me && (
        <Card>
          <h2 className="font-bold">
            {coop.emoji} {t('coop.title')}: {coop.title}
          </h2>
          <Progress value={Object.values(coop.contributions).reduce((a, b) => a + b, 0)} max={coop.targetCount} className="my-2" />
          <p className="muted text-sm">
            {t('coop.yourPart', { n: coop.contributions[me.id] ?? 0 })} · {t('coop.private')}
          </p>
          {coop.status === 'reached' && <p className="mt-2">🎉 {coop.celebration ?? t('coop.reached')}</p>}
        </Card>
      )}
      <Button variant="ghost" className="w-full" onClick={() => setProposeOpen(true)}>
        💡 {t('goal.propose')}
      </Button>
      <Modal open={proposeOpen} onClose={() => setProposeOpen(false)} title={t('goal.propose')}>
        <div className="flex gap-2 mb-3">
          <input className="input w-16 text-center" value={proposal.emoji} onChange={(e) => setProposal({ ...proposal, emoji: e.target.value })} aria-label="emoji" />
          <input className="input" value={proposal.title} onChange={(e) => setProposal({ ...proposal, title: e.target.value })} placeholder={t('onboarding.goalPlaceholder')} />
        </div>
        <label className="label">{t('goal.target')}</label>
        <input className="input mb-3" type="number" min={5} value={proposal.target} onChange={(e) => setProposal({ ...proposal, target: Number(e.target.value) })} />
        <Button className="w-full" disabled={!proposal.title.trim()} onClick={async () => { if (me && family) { await createGoal(me.id, { familyId: family.id, childId: me.id, title: proposal.title, emoji: proposal.emoji, targetPoints: proposal.target, primary: false, status: 'proposed' }); setProposeOpen(false); } }}>
          {t('common.send')}
        </Button>
      </Modal>
    </div>
  );
}

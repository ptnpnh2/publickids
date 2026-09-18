import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBalance, useFamily, useMe, useRedemptions, useRewards } from '@/hooks/useData';
import { Button, Card, ErrorText, Modal, Toast, useToast } from '@/components/ui';
import { createReward, redeemReward } from '@/services/rewards';
import type { Reward, RewardSection } from '@/domain/types';

const SECTIONS: RewardSection[] = ['quick', 'family', 'save_for', 'extra_job_money'];

export default function Store() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const rewards = useRewards();
  const balance = useBalance(me?.id);
  const redemptions = useRedemptions(me?.id);
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposal, setProposal] = useState({ title: '', emoji: '🎈', cost: 5 });
  const visible = rewards.filter((r) => r.status === 'active' && (!r.childIds?.length || (me && r.childIds.includes(me.id))));

  async function redeem(r: Reward) {
    if (!me) return;
    setError(null);
    try {
      await redeemReward(me.id, r.id);
      toast.show(t('store.requested', { title: r.title }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function propose() {
    if (!me || !family) return;
    await createReward(me.id, { familyId: family.id, title: proposal.title, emoji: proposal.emoji, section: 'quick', cost: proposal.cost, availability: 'always', status: 'proposed', proposedBy: me.id, childIds: [me.id] });
    setProposeOpen(false);
    toast.show(t('store.proposed'));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t('nav.store')}</h1>
        <div className="chip text-base">⭐ {balance}</div>
      </div>
      <ErrorText error={error} />
      {SECTIONS.map((sec) => {
        const items = visible.filter((r) => r.section === sec);
        if (!items.length) return null;
        return (
          <section key={sec}>
            <h2 className="font-bold muted text-sm uppercase tracking-wide mb-2">{t(`store.section.${sec}`)}</h2>
            <div className="grid gap-2">
              {items.map((r) => {
                const pending = redemptions.find((x) => x.rewardId === r.id && x.status === 'requested');
                return (
                  <Card key={r.id} className="flex items-center gap-3">
                    <span className="text-3xl">{r.emoji}</span>
                    <span className="flex-1">
                      <span className="font-bold block">{r.title}</span>
                      <span className="muted text-xs">{r.availability === 'weekend' ? t('store.weekendOnly') : ''}</span>
                    </span>
                    {pending ? (
                      <span className="chip">{t('store.pending')}</span>
                    ) : (
                      <Button variant={balance >= r.cost ? 'primary' : 'secondary'} disabled={balance < r.cost} onClick={() => redeem(r)}>
                        ⭐ {r.cost}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
      {visible.length === 0 && <p className="muted text-center py-8">{t('store.empty')}</p>}
      <Button variant="ghost" className="w-full" onClick={() => setProposeOpen(true)}>
        💡 {t('store.propose')}
      </Button>
      <p className="muted text-xs text-center">{t('store.neverStore')}</p>
      <Modal open={proposeOpen} onClose={() => setProposeOpen(false)} title={t('store.propose')}>
        <div className="flex gap-2 mb-3">
          <input className="input w-16 text-center" value={proposal.emoji} onChange={(e) => setProposal({ ...proposal, emoji: e.target.value })} aria-label="emoji" />
          <input className="input" placeholder={t('store.proposalPlaceholder')} value={proposal.title} onChange={(e) => setProposal({ ...proposal, title: e.target.value })} />
        </div>
        <label className="label">{t('store.suggestedCost')}</label>
        <input className="input mb-3" type="number" min={1} value={proposal.cost} onChange={(e) => setProposal({ ...proposal, cost: Number(e.target.value) })} />
        <Button className="w-full" disabled={!proposal.title.trim()} onClick={propose}>
          {t('common.send')}
        </Button>
      </Modal>
      <Toast message={toast.message} onDone={toast.clear} />
    </div>
  );
}

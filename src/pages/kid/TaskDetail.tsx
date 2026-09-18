import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useMe, useStages, useSubmissions } from '@/hooks/useData';
import { Button, Card, ErrorText, Modal } from '@/components/ui';
import { Celebration } from '@/components/Celebration';
import { dateKey } from '@/domain/time';
import { prepareImage, recordAudio } from '@/services/media';
import { appeal, requestHelp, submitTask } from '@/services/submissions';
import type { HelpKind, ProofMethod } from '@/domain/types';

/** Success Card + one main action. A child normally completes in 10–20 seconds. */
export default function TaskDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const me = useMe();
  const task = useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id]);
  const stages = useStages(me?.id);
  const subs = useSubmissions(me?.id);
  const today = dateKey();
  const todaySub = subs.find((s) => s.taskId === id && s.dateKey === today && s.status !== 'withdrawn' && s.status !== 'retry');
  const stage = stages.find((s) => s.taskId === id)?.stage ?? 'learning';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState<boolean[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState<{ stop: () => Promise<Blob> } | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const t0 = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t0);
  }, [recording]);

  const finish = useCallback(() => {
    setCelebrate(false);
    nav('/kid/today');
  }, [nav]);

  if (!task || !me) return null;
  const proof: ProofMethod = task.proofMethod;
  const speak = me.child?.audioSupport && 'speechSynthesis' in window;

  function readAloud() {
    if (!task) return;
    const u = new SpeechSynthesisUtterance([task.title, ...task.microSteps, task.completionDefinition].join('. '));
    u.lang = me?.locale === 'uk' ? 'uk-UA' : me?.locale === 'es' ? 'es-ES' : 'en-US';
    speechSynthesis.speak(u);
  }

  async function submit(media?: { blob: Blob; mime: string; hash?: string }) {
    if (!task || !me) return;
    setBusy(true);
    setError(null);
    try {
      await submitTask({ task, child: me, proofMethod: proof, media, note: note || undefined, reminderCount: 0, independentStart: true });
      setCelebrate(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const prepared = await prepareImage(f);
      await submit({ blob: prepared.blob, mime: prepared.mime, hash: prepared.hash });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function toggleRecord() {
    if (recording) {
      const blob = await recording.stop();
      setRecording(null);
      await submit({ blob, mime: blob.type || 'audio/webm' });
    } else {
      try {
        setSeconds(0);
        setRecording(await recordAudio(60));
      } catch {
        setError('proof.micDenied');
      }
    }
  }

  async function sendHelp(kind: HelpKind) {
    if (!task || !me) return;
    await requestHelp(task, me, kind, note || undefined);
    setHelpOpen(false);
    nav('/kid/today');
  }

  const stepsDone = task.microSteps.length === 0 || checked.filter(Boolean).length === task.microSteps.length;

  return (
    <div className="space-y-4">
      {celebrate && <Celebration style={me.child?.celebration ?? 'fun'} soundOff={me.child?.soundOff} text={t(proof === 'none' || proof === 'self_check' ? 'proof.sentSelf' : 'proof.sent')} onDone={finish} />}
      <button className="btn btn-ghost" onClick={() => nav(-1)}>
        ← {t('common.back')}
      </button>
      <Card>
        <div className="flex items-start gap-3">
          <span className="text-5xl" aria-hidden>
            {task.emoji}
          </span>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold">{task.title}</h1>
            <p className="muted text-sm">
              {task.window.start}–{task.window.end} · ~{task.estimatedMinutes} {t('common.min')} · {t(`stage.${stage}`)}
            </p>
            <p className="text-sm mt-1">
              {task.currency === 'points' && stage !== 'graduated' ? `⭐ ${task.basePoints} · ${t(task.fairness)}` : `👏 ${t('task.ackOnly')}`}
              {stage === 'independent' && task.currency === 'points' && <span className="muted"> · {t('stage.independentRule')}</span>}
            </p>
          </div>
        </div>
        {task.imageUrl && <img src={task.imageUrl} alt="" className="rounded-xl mt-3 w-full max-h-56 object-cover" />}
        {speak && (
          <Button variant="secondary" className="mt-3" onClick={readAloud}>
            🔊 {t('task.readAloud')}
          </Button>
        )}
        {task.microSteps.length > 0 && (
          <ol className="mt-3 space-y-2">
            {task.microSteps.map((s, i) => (
              <li key={i}>
                <label className="flex items-center gap-3" style={{ minHeight: 'var(--target)' }}>
                  <input type="checkbox" className="w-6 h-6" checked={!!checked[i]} onChange={(e) => { const c = [...checked]; c[i] = e.target.checked; setChecked(c); }} />
                  <span className={checked[i] ? 'line-through muted' : ''}>{s}</span>
                </label>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-sm">
          <b>{t('task.doneWhen')}:</b> {task.completionDefinition}
        </p>
      </Card>

      {todaySub ? (
        <Card>
          <p className="font-semibold">{t(`status.${todaySub.status}`)}</p>
          {todaySub.status === 'needs_look' && <p className="muted text-sm">{t('proof.needsLookExplain')}</p>}
          {todaySub.feedback && <p className="mt-2">💬 {todaySub.feedback}</p>}
          {todaySub.appeal && <p className="muted text-sm mt-2">{t('appeal.status', { status: t(`appeal.${todaySub.appeal.status}`) })}</p>}
          {(todaySub.status === 'needs_look' || todaySub.status === 'submitted') && !todaySub.appeal && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="secondary" onClick={() => setAppealOpen(true)}>
                {t('appeal.incorrect')}
              </Button>
              <Button variant="secondary" onClick={() => setHelpOpen(true)}>
                {t('help.askParent')}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <textarea className="input mb-3" rows={2} placeholder={t('task.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
          {(proof === 'none' || proof === 'self_check' || proof === 'parent_observed') && (
            <Button className="w-full text-lg" disabled={busy || !stepsDone} onClick={() => submit()}>
              ✅ {proof === 'parent_observed' ? t('proof.askToCheck') : t('proof.iDidIt')}
            </Button>
          )}
          {proof === 'photo' && (
            <>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
              <Button className="w-full text-lg" disabled={busy || !stepsDone} onClick={() => fileRef.current?.click()}>
                📸 {t('proof.takePhoto')}
              </Button>
              <p className="muted text-xs mt-2">{t('proof.photoPrivacy')}</p>
            </>
          )}
          {proof === 'audio' && (
            <Button className="w-full text-lg" disabled={busy || !stepsDone} onClick={toggleRecord}>
              {recording ? `⏹ ${t('proof.stop')} (${seconds}s)` : `🎙️ ${t('proof.record')}`}
            </Button>
          )}
          {proof === 'video' && (
            <>
              <input ref={fileRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await submit({ blob: f, mime: f.type }); }} />
              <Button className="w-full text-lg" disabled={busy || !stepsDone} onClick={() => fileRef.current?.click()}>
                🎥 {t('proof.recordVideo')}
              </Button>
            </>
          )}
          {!stepsDone && <p className="muted text-xs mt-2 text-center">{t('task.tickSteps')}</p>}
          <ErrorText error={error} />
          <div className="flex justify-center mt-3">
            <Button variant="ghost" onClick={() => setHelpOpen(true)}>
              🙋 {t('help.title')}
            </Button>
          </div>
        </Card>
      )}

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={t('help.title')}>
        <p className="muted text-sm mb-3">{t('help.explain')}</p>
        <div className="grid gap-2">
          {(['need_help', 'too_hard', 'something_changed'] as HelpKind[]).map((k) => (
            <Button key={k} variant="secondary" onClick={() => sendHelp(k)}>
              {t(`help.${k}`)}
            </Button>
          ))}
        </div>
      </Modal>
      <Modal open={appealOpen} onClose={() => setAppealOpen(false)} title={t('appeal.incorrect')}>
        <textarea className="input" rows={3} value={appealText} onChange={(e) => setAppealText(e.target.value)} placeholder={t('appeal.placeholder')} />
        <Button className="w-full mt-3" disabled={!appealText.trim()} onClick={async () => { if (todaySub) await appeal(me.id, todaySub.id, appealText); setAppealOpen(false); }}>
          {t('common.send')}
        </Button>
      </Modal>
    </div>
  );
}

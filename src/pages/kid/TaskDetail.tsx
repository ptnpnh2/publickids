import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useFamily, useMe, useStages, useSubmissions } from '@/hooks/useData';
import { Button, Card, ErrorText, Modal } from '@/components/ui';
import { Celebration } from '@/components/Celebration';
import { dateKey } from '@/domain/time';
import { prepareImage, recordAudio } from '@/services/media';
import { appeal, requestHelp, submitTask } from '@/services/submissions';
import { makeNonce, nonceValid, videoWithinCaps, MAX_VIDEO_SECONDS } from '@/domain/nonce';
import { reflectionDue, REFLECTION_KINDS } from '@/domain/reading';
import { requestCameraClip, giveChildAssent } from '@/services/camera';
import { analyzeClip, type ClipAnalysis } from '@/services/pose';
import type { HelpKind, ProofMethod, ReflectionKind } from '@/domain/types';

/** Success Card + one main action. A child normally completes in 10–20 seconds. */
export default function TaskDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const me = useMe();
  const family = useFamily();
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
  const [nonce, setNonce] = useState<ReturnType<typeof makeNonce> | null>(null);
  const [reps, setReps] = useState<number | ''>('');
  const [reflection, setReflection] = useState<{ kind: ReflectionKind; text: string }>({ kind: 'note', text: '' });
  const [cameraBusy, setCameraBusy] = useState(false);
  const [counting, setCounting] = useState<number | null>(null);
  const [auto, setAuto] = useState<ClipAnalysis | null>(null);

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
  const sessionsSoFar = subs.filter((s) => s.taskId === task.id && s.status === 'approved').length;
  const readingReflect = !!task.reading && reflectionDue(sessionsSoFar + 1, task.reading.reflectEvery);
  const camera = task.cameraId ? family?.settings.camera.cameras.find((c) => c.id === task.cameraId) : undefined;
  const cameraAssented = !!camera?.childAssent[me.id];

  function readAloud() {
    if (!task) return;
    const u = new SpeechSynthesisUtterance([task.title, ...task.microSteps, task.completionDefinition].join('. '));
    u.lang = me?.locale === 'uk' ? 'uk-UA' : me?.locale === 'es' ? 'es-ES' : 'en-US';
    speechSynthesis.speak(u);
  }

  /** On-device rep count for exercise clips; failures never block the submission. */
  async function countClip(blob: Blob): Promise<ClipAnalysis | null> {
    if (!task?.exercise) return null;
    try {
      setCounting(0);
      const r = await analyzeClip(blob, task.exercise.kind, setCounting);
      setAuto(r);
      if (reps === '' && r.confidence >= 0.5) setReps(r.count);
      return r;
    } catch {
      return null;
    } finally {
      setCounting(null);
    }
  }

  async function submit(media?: { blob: Blob; mime: string; hash?: string }, extra: { cameraClip?: { cameraId: string; requestedAt: string; seconds: number } } = {}) {
    if (!task || !me) return;
    setBusy(true);
    setError(null);
    const autoResult = media && media.mime.startsWith('video/') ? await countClip(media.blob) : null;
    try {
      await submitTask({
        task, child: me, proofMethod: proof, media, note: note || undefined, independentStart: undefined,
        nonce: task.nonce && nonce ? nonce : undefined,
        repsClaimed: task.exercise ? Number(reps) || task.exercise.reps : undefined,
        repsAuto: autoResult ? { count: autoResult.count, confidence: autoResult.confidence, trackedPct: autoResult.trackedPct, unit: autoResult.unit, model: autoResult.model } : undefined,
        reflection: readingReflect ? { kind: reflection.kind, text: reflection.text || undefined } : undefined,
        cameraClip: extra.cameraClip,
      });
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

  async function onVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (task?.nonce && !nonceValid(nonce ?? undefined)) return setError('proof.nonceExpired');
    if (!videoWithinCaps(MAX_VIDEO_SECONDS, f.size)) return setError('proof.videoTooLarge');
    await submit({ blob: f, mime: f.type || 'video/mp4' });
  }

  async function onCameraProof() {
    if (!task || !me) return;
    setCameraBusy(true);
    setError(null);
    const res = await requestCameraClip(me, task, Math.min(family?.settings.camera.maxClipSeconds ?? 30, 60));
    setCameraBusy(false);
    if ('error' in res) return setError(res.error);
    await submit({ blob: res.blob, mime: res.mime }, { cameraClip: { cameraId: task.cameraId!, requestedAt: new Date().toISOString(), seconds: family?.settings.camera.maxClipSeconds ?? 30 } });
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
  const canSubmit = !busy && stepsDone && (!readingReflect || reflection.kind === 'conversation' || reflection.kind === 'selflog' || reflection.kind === 'drawing' || reflection.kind === 'retell' || reflection.text.trim().length > 0);

  return (
    <div className="space-y-4">
      {celebrate && <Celebration style={me.child?.celebration ?? 'fun'} soundOff={me.child?.soundOff} text={t(proof === 'none' || proof === 'self_check' ? 'proof.sentSelf' : 'proof.sent')} onDone={finish} />}
      <button className="btn btn-ghost" onClick={() => nav(-1)}>
        ← {t('common.back')}
      </button>
      <Card>
        <div className="flex items-start gap-3">
          <span className="task-emoji text-3xl" style={{ width: 64, height: 64 }} aria-hidden>
            {task.emoji}
          </span>
          <div className="flex-1">
            <h1 className="display text-2xl font-extrabold leading-tight">{task.title}</h1>
            <p className="muted text-sm mt-1">
              {task.window.start}–{task.window.end} · ~{task.estimatedMinutes} {t('common.min')} · {t(`stage.${stage}`)}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {task.category === 'extra_job' && task.moneyAmount ? (
                <span className="chip chip-accent">💶 {task.moneyAmount} {family?.settings.money.currency}</span>
              ) : task.currency === 'points' && stage !== 'graduated' ? (
                <span className="chip">⭐ {task.basePoints} · {t(task.fairness)}</span>
              ) : (
                <span className="chip chip-ok">👏 {t('task.ackOnly')}</span>
              )}
              {stage === 'independent' && task.currency === 'points' && <span className="chip">{t('stage.independentRule')}</span>}
              {task.exercise && <span className="chip">{task.exercise.reps} × {t(`exercise.${task.exercise.kind}`)}</span>}
            </div>
          </div>
        </div>
        {task.imageUrl && <img src={task.imageUrl} alt="" className="rounded-2xl mt-3 w-full max-h-56 object-cover" />}
        {speak && (
          <Button variant="secondary" className="mt-3" onClick={readAloud}>
            🔊 {t('task.readAloud')}
          </Button>
        )}
        {task.microSteps.length > 0 && (
          <ol className="mt-3 space-y-1">
            {task.microSteps.map((s, i) => (
              <li key={i}>
                <label className="flex items-center gap-3 rounded-xl px-2" style={{ minHeight: 'var(--target)', background: checked[i] ? 'var(--ok-soft)' : 'transparent' }}>
                  <input type="checkbox" className="w-6 h-6" checked={!!checked[i]} onChange={(e) => { const c = [...checked]; c[i] = e.target.checked; setChecked(c); }} />
                  <span className={checked[i] ? 'line-through muted' : 'font-semibold'}>{s}</span>
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
          <p className="font-extrabold">{t(`status.${todaySub.status}`)}</p>
          {todaySub.status === 'needs_look' && <p className="muted text-sm">{t('proof.needsLookExplain')}</p>}
          {todaySub.nonce && <p className="muted text-xs mt-1">{t('proof.nonceWas', { code: todaySub.nonce.code })}</p>}
          {todaySub.feedback && <p className="mt-2">💬 {todaySub.feedback}</p>}
          {todaySub.repsAuto && <p className="text-sm mt-1">🤖 {t('proof.autoCounted', { n: todaySub.repsAuto.count, unit: t(`proof.unit.${todaySub.repsAuto.unit}`), pct: Math.round(todaySub.repsAuto.confidence * 100) })}</p>}
          {todaySub.ai?.repsCounted !== undefined && <p className="text-sm mt-1">☁️ {t('proof.serverCounted', { n: todaySub.ai.repsCounted })}</p>}
          {todaySub.repsCounted !== undefined && <p className="text-sm mt-1">💪 {t('proof.repsCounted', { n: todaySub.repsCounted })}</p>}
          {todaySub.appeal && <p className="muted text-sm mt-2">{t('appeal.status', { status: t(`appeal.${todaySub.appeal.status}`) })}</p>}
          {(todaySub.status === 'needs_look' || todaySub.status === 'submitted') && !todaySub.appeal && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="secondary" onClick={() => setAppealOpen(true)}>{t('appeal.incorrect')}</Button>
              <Button variant="secondary" onClick={() => setHelpOpen(true)}>{t('help.askParent')}</Button>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          {task.exercise && (
            <div className="mb-3">
              <label className="label">{t('proof.repsDone', { kind: t(`exercise.${task.exercise.kind}`) })}</label>
              <div className="flex gap-2 items-center">
                <input className="input w-28 text-center text-xl font-extrabold" type="number" min={0} inputMode="numeric" placeholder={String(task.exercise.reps)} value={reps} onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))} />
                <span className="muted text-sm">/ {task.exercise.reps}</span>
              </div>
            </div>
          )}
          {readingReflect && task.reading && (
            <div className="mb-3">
              <p className="font-extrabold mb-1">📖 {t('reading.reflectTitle', { book: task.reading.bookTitle })}</p>
              <p className="muted text-xs mb-2">{t('reading.reflectHint')}</p>
              <select className="input mb-2" value={reflection.kind} onChange={(e) => setReflection({ ...reflection, kind: e.target.value as ReflectionKind })}>
                {REFLECTION_KINDS.filter((k) => k !== 'quiz' || task.reading!.quiz?.length).map((k) => (
                  <option key={k} value={k}>{t(`reading.kind.${k}`)}</option>
                ))}
              </select>
              {reflection.kind === 'quiz' && task.reading.quiz?.map((q, i) => <p key={i} className="text-sm mb-1">❓ {q.q}</p>)}
              {(reflection.kind === 'passage' || reflection.kind === 'note' || reflection.kind === 'quiz') && (
                <textarea className="input" rows={3} placeholder={t(`reading.placeholder.${reflection.kind}`)} value={reflection.text} onChange={(e) => setReflection({ ...reflection, text: e.target.value })} />
              )}
            </div>
          )}
          <textarea className="input mb-3" rows={2} placeholder={t('task.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
          {(proof === 'none' || proof === 'self_check' || proof === 'parent_observed') && (
            <Button className="w-full text-lg" disabled={!canSubmit} onClick={() => submit()}>
              ✅ {proof === 'parent_observed' ? t('proof.askToCheck') : t('proof.iDidIt')}
            </Button>
          )}
          {proof === 'photo' && (
            <>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
              <Button className="w-full text-lg" disabled={!canSubmit} onClick={() => fileRef.current?.click()}>
                📸 {t('proof.takePhoto')}
              </Button>
              <p className="muted text-xs mt-2">{t('proof.photoPrivacy')}</p>
            </>
          )}
          {proof === 'audio' && (
            <Button className="w-full text-lg" disabled={!canSubmit} onClick={toggleRecord}>
              {recording ? `⏹ ${t('proof.stop')} (${seconds}s)` : `🎙️ ${t('proof.record')}`}
            </Button>
          )}
          {proof === 'video' && (
            <>
              {task.nonce && (
                <div className="rounded-2xl p-3 mb-3 text-center" style={{ background: 'var(--accent-soft)' }}>
                  {nonce && nonceValid(nonce) ? (
                    <>
                      <div className="text-xs font-bold uppercase tracking-wide muted">{t('proof.nonceSay')}</div>
                      <div className="display text-3xl font-extrabold">{nonce.code}</div>
                      <div className="muted text-xs">{t('proof.nonceTtl')}</div>
                    </>
                  ) : (
                    <Button variant="accent" onClick={() => setNonce(makeNonce())}>✨ {t('proof.nonceStart')}</Button>
                  )}
                </div>
              )}
              <input ref={fileRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={onVideo} />
              <Button className="w-full text-lg" disabled={!canSubmit || (task.nonce && !nonceValid(nonce ?? undefined))} onClick={() => fileRef.current?.click()}>
                🎥 {t('proof.recordVideo')}
              </Button>
              <p className="muted text-xs mt-2">{t('proof.videoCaps', { s: MAX_VIDEO_SECONDS })}</p>
              {task.exercise && <p className="muted text-xs mt-1">{t('proof.autoCountHint')}</p>}
              {counting !== null && (
                <div className="mt-2">
                  <p className="text-sm font-bold pulse">🤖 {t('proof.counting', { pct: counting })}</p>
                  <div className="progress mt-1"><div style={{ width: `${counting}%` }} /></div>
                </div>
              )}
              {auto && counting === null && <p className="text-sm mt-2">🤖 {t('proof.autoCounted', { n: auto.count, unit: t(`proof.unit.${auto.unit}`), pct: Math.round(auto.confidence * 100) })}</p>}
              {camera && family?.settings.camera.enabled && (
                <div className="mt-3 divider pt-3">
                  {cameraAssented ? (
                    <Button variant="secondary" className="w-full" disabled={!canSubmit || cameraBusy} onClick={onCameraProof}>
                      {cameraBusy ? <span className="pulse">🔴 {t('camera.recording')}</span> : `📹 ${t('camera.start', { name: camera.name })}`}
                    </Button>
                  ) : (
                    <Button variant="ghost" className="w-full" onClick={() => giveChildAssent(me.id, camera.id)}>
                      {t('camera.assent', { name: camera.name, zone: camera.zone })}
                    </Button>
                  )}
                  <p className="muted text-xs mt-1">{t('camera.childNote')}</p>
                </div>
              )}
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
            <Button key={k} variant="secondary" onClick={() => sendHelp(k)}>{t(`help.${k}`)}</Button>
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

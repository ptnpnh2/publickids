import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useSession } from '@/services/session';
import { Shell } from '@/components/Layout';
import { db } from '@/db/schema';
import { closeWeeks, refreshMomentum } from '@/services/momentum';
import { sweepMedia } from '@/services/submissions';
import { applyMonthlyInterest } from '@/services/money';
import { configureVerifier, remoteVerifier } from '@/services/verification';
import Welcome from '@/pages/auth/Welcome';
import CreateFamily from '@/pages/auth/CreateFamily';
import ParentLogin from '@/pages/auth/ParentLogin';
import ChildLogin from '@/pages/auth/ChildLogin';
import Onboarding from '@/pages/auth/Onboarding';
import Today from '@/pages/kid/Today';
import TaskDetail from '@/pages/kid/TaskDetail';
import Store from '@/pages/kid/Store';
import GoalPage from '@/pages/kid/Goal';
import Me from '@/pages/kid/Me';
import Approvals from '@/pages/parent/Approvals';
import Tasks from '@/pages/parent/Tasks';
import TaskEditor from '@/pages/parent/TaskEditor';
import Rewards from '@/pages/parent/Rewards';
import Family from '@/pages/parent/Family';
import MemberEditor from '@/pages/parent/MemberEditor';
import More from '@/pages/parent/More';
import Settings from '@/pages/parent/Settings';
import Momentum from '@/pages/parent/Momentum';
import Digest from '@/pages/parent/Digest';
import Repair from '@/pages/parent/Repair';
import Agreement from '@/pages/parent/Agreement';
import AuditLog from '@/pages/parent/AuditLog';
import Coop from '@/pages/parent/Coop';
import Starter from '@/pages/parent/Starter';
import Guide from '@/pages/parent/Guide';
import ChildProgress from '@/pages/parent/ChildProgress';
import Money from '@/pages/parent/Money';
import Balance from '@/pages/parent/Balance';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
if (supabaseUrl && supabaseKey) configureVerifier(remoteVerifier(supabaseUrl, supabaseKey));

function useHousekeeping() {
  const session = useSession((s) => s.session);
  useEffect(() => {
    if (!session) return;
    void (async () => {
      const children = await db.members.where('familyId').equals(session.familyId).filter((m) => m.role === 'child' && !m.archived).toArray();
      for (const c of children) {
        await refreshMomentum(c);
        await closeWeeks(c);
        await applyMonthlyInterest(session.familyId, c.id);
      }
      await sweepMedia(session.familyId);
    })();
  }, [session]);
}

function Guard({ kind, children }: { kind: 'child' | 'adult'; children: React.ReactElement }) {
  const session = useSession((s) => s.session);
  const loc = useLocation();
  if (!session) return <Navigate to="/welcome" state={{ from: loc }} replace />;
  if (kind === 'child' && session.role !== 'child') return <Navigate to="/parent/approvals" replace />;
  if (kind === 'adult' && session.role === 'child') return <Navigate to="/kid/today" replace />;
  return children;
}

export default function App() {
  const { t } = useTranslation();
  const session = useSession((s) => s.session);
  useHousekeeping();
  const kidNav = [
    { to: '/kid/today', label: t('nav.today'), emoji: '☀️' },
    { to: '/kid/store', label: t('nav.store'), emoji: '🛍️' },
    { to: '/kid/goal', label: t('nav.goal'), emoji: '🎯' },
    { to: '/kid/me', label: t('nav.me'), emoji: '🙂' },
  ];
  const parentNav = [
    { to: '/parent/approvals', label: t('nav.approve'), emoji: '✅' },
    { to: '/parent/tasks', label: t('nav.tasks'), emoji: '📋' },
    { to: '/parent/rewards', label: t('nav.rewards'), emoji: '🎁' },
    { to: '/parent/family', label: t('nav.family'), emoji: '👪' },
    { to: '/parent/more', label: t('nav.more'), emoji: '⚙️' },
  ];
  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? (session.role === 'child' ? '/kid/today' : '/parent/approvals') : '/welcome'} replace />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/create" element={<CreateFamily />} />
      <Route path="/login/parent" element={<ParentLogin />} />
      <Route path="/login/child" element={<ChildLogin />} />
      <Route path="/onboarding" element={<Guard kind="adult"><Onboarding /></Guard>} />
      <Route path="/kid" element={<Guard kind="child"><Shell items={kidNav} /></Guard>}>
        <Route path="today" element={<Today />} />
        <Route path="task/:id" element={<TaskDetail />} />
        <Route path="store" element={<Store />} />
        <Route path="goal" element={<GoalPage />} />
        <Route path="me" element={<Me />} />
      </Route>
      <Route path="/parent" element={<Guard kind="adult"><Shell items={parentNav} /></Guard>}>
        <Route path="approvals" element={<Approvals />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/new" element={<TaskEditor />} />
        <Route path="tasks/:id" element={<TaskEditor />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="family" element={<Family />} />
        <Route path="family/new" element={<MemberEditor />} />
        <Route path="family/:id" element={<MemberEditor />} />
        <Route path="family/:id/progress" element={<ChildProgress />} />
        <Route path="more" element={<More />} />
        <Route path="settings" element={<Settings />} />
        <Route path="momentum" element={<Momentum />} />
        <Route path="digest" element={<Digest />} />
        <Route path="repair" element={<Repair />} />
        <Route path="agreement" element={<Agreement />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="coop" element={<Coop />} />
        <Route path="starter" element={<Starter />} />
        <Route path="guide" element={<Guide />} />
        <Route path="money" element={<Money />} />
        <Route path="balance" element={<Balance />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

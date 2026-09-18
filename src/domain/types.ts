/**
 * Domain types. These mirror the Supabase schema in supabase/migrations so the
 * local (IndexedDB) store and a future synced backend share one shape.
 */
export type Locale = 'en' | 'uk' | 'es' | 'ru';
export type ID = string;
export type ISODate = string; // ISO-8601 timestamp
export type DateKey = string; // YYYY-MM-DD, family-local

export type Preset = 'simple' | 'balanced' | 'independent' | 'custom';
export type ThemeName = 'sunny' | 'space' | 'forest' | 'ocean';
export type CelebrationStyle = 'quiet' | 'fun' | 'big';

export type Role = 'parent' | 'coparent' | 'nanny' | 'sponsor' | 'child';

export type AgeBand = '4-6' | '7-9' | '10-12' | 'teen';

export interface ChildProfile {
  ageBand: AgeBand;
  literacy: 'pictures' | 'simple' | 'full';
  visualDensity: 'low' | 'medium' | 'high';
  audioSupport: boolean;
  independence: 'guided' | 'shared' | 'self';
  planningHorizonDays: 1 | 3 | 7;
  proofComplexity: 'none' | 'simple' | 'standard';
  celebration: CelebrationStyle;
  reducedMotion: boolean;
  highContrast: boolean;
  largeTargets: boolean;
  soundOff: boolean;
  simplifiedLanguage: boolean;
  extraProcessingTime: boolean;
  theme: ThemeName;
  momentumSkin: 'neutral' | 'space' | 'garden';
  avatar: { emoji: string; unlocked: string[]; equipped: string[] };
  independenceMode: boolean;
  appFreeDays: number[]; // 0..6, Sunday=0
  fadingReminders: boolean;
  freshStartAt?: ISODate;
  vacationUntil?: ISODate;
  sickDays: DateKey[];
  graduatedFromApp?: ISODate;
  season?: string; // chosen quest season (never expires)
  castle: string[]; // unlocked castle tiles (never ruined)
}

export interface Member {
  id: ID;
  familyId: ID;
  name: string;
  role: Role;
  emoji: string;
  locale: Locale;
  email?: string;
  passwordHash?: string; // adults
  pinHash?: string; // children
  isSupervisor: boolean;
  isSuperUser: boolean;
  scopedChildIds?: ID[]; // nanny / sponsor
  approvalLimit?: number; // nanny: max base points they may approve
  child?: ChildProfile;
  createdAt: ISODate;
  archived?: boolean;
}

export interface MomentumLevel {
  key: string;
  name: string;
  coefficient: number; // 1.00 .. ; below 1.00 requires explicit confirmation
  minPct: number; // 0..100 of selected commitments met in window
  windowDays: number;
  requiresGraduatedHabit: boolean;
  requiresFewerReminders: boolean;
}

export interface MomentumConfig {
  version: number;
  levels: MomentumLevel[]; // ordered from starting upward
  weeklyCapPct: number; // default 15
  gracePeriodDays: number; // default 14
  updatedBy?: ID;
  updatedAt?: ISODate;
  childOverrides?: Record<ID, Partial<Pick<MomentumConfig, 'levels' | 'weeklyCapPct'>>>;
}

export interface FamilySettings {
  preset: Preset;
  responseCostEnabled: boolean; // off by default
  coolingOffMinutes: number;
  activeTrainingCap: number; // max habits earning frequent points per child
  autoApproveAuditPct: number; // ~10
  autoApproveMinHistory: number; // successful manual reviews before auto mode is offered
  nannyApprovalLimit: number;
  quietHours: { start: string; end: string };
  schoolMode: boolean;
  holidayMode: boolean;
  remindersPerTask: number; // 1 by default
  deleteRawProofOnResolve: boolean; // true by default
  aiEnabled: boolean;
  rawProofRetentionDays: number;
  money: MoneySettings;
  camera: CameraSettings;
}

export interface MoneySettings {
  enabled: boolean;
  currency: string; // ISO code shown to the family, e.g. EUR
  interestPctMonthly: number; // parent-funded 'interest' on the save jar
  jars: { save: number; spend: number; give: number }; // default split in %
}

/** Optional IP-camera connector (§2.3): off by default, event clips only, never sensitive zones. */
export interface CameraSettings {
  enabled: boolean;
  gatewayUrl?: string; // local read-only gateway (see gateway/)
  parentConsentAt?: ISODate;
  cameras: CameraConfig[];
  maxClipSeconds: number; // ≤ 60
  dailyClipLimit: number;
  deleteClipsOnResolve: boolean;
}

export interface CameraConfig {
  id: string;
  name: string;
  zone: string; // e.g. 'living room mat' — bedrooms/bathrooms are refused
  window: { start: string; end: string };
  childAssent: Record<ID, ISODate>;
}

export interface Family {
  id: ID;
  name: string;
  locale: Locale;
  settings: FamilySettings;
  momentum: MomentumConfig;
  starter?: { startedAt: ISODate; completedAt?: ISODate };
  recoveryCodeHashes: string[];
  createdAt: ISODate;
}

export type TaskCategory =
  | 'selfcare' // baseline self-care: acknowledgment by default
  | 'contribution' // family contribution: acknowledgment by default; temporary points while learning
  | 'routine' // routines and school effort: tokens only, effort-based
  | 'learning' // practice, reading routine
  | 'extra_job' // money-eligible extra job (money ledger arrives in V2; points only here)
  | 'repair'; // repair plans: never rewarded

export type Currency = 'ack' | 'points';
export type ProofMethod = 'none' | 'self_check' | 'parent_observed' | 'photo' | 'audio' | 'video';
export type VerificationMode = 'manual' | 'ai_assist' | 'auto';
export type ApproverTier = 'auto' | 'caregiver' | 'parent';
export type BasePoints = 1 | 2 | 3 | 5;

export interface Schedule {
  type: 'daily' | 'weekdays' | 'weekly' | 'once';
  days?: number[]; // for weekly, 0..6
  date?: DateKey; // for once
}

export interface Task {
  id: ID;
  familyId: ID;
  title: string;
  emoji: string;
  imageUrl?: string;
  category: TaskCategory;
  currency: Currency;
  basePoints: BasePoints;
  fairness: string; // child-friendly explanation of value
  microSteps: string[]; // up to 5
  estimatedMinutes: number;
  completionDefinition: string;
  window: { start: string; end: string }; // HH:MM
  schedule: Schedule;
  proofMethod: ProofMethod;
  verificationMode: VerificationMode;
  approverTier: ApproverTier;
  assignedChildIds: ID[];
  choiceGroup?: string; // "choose one of" group key
  coop?: boolean; // counts toward the family co-op adventure
  moneyAmount?: number; // extra_job only: amount in family currency units
  nonce?: boolean; // video proof must show a fresh on-screen challenge
  exercise?: { kind: 'pushups' | 'squats' | 'plank' | 'jumps' | 'other'; reps: number };
  reading?: { bookTitle: string; reflectEvery: number; quiz?: { q: string; a: string }[] };
  cameraId?: string; // optional camera proof for this task
  active: boolean;
  proposedBy?: ID; // child proposal awaiting parent approval
  createdBy: ID;
  createdAt: ISODate;
  archived?: boolean;
}

export type Stage = 'learning' | 'practicing' | 'independent' | 'graduated';

export interface TaskStage {
  id: ID; // `${taskId}:${childId}`
  familyId: ID;
  taskId: ID;
  childId: ID;
  stage: Stage;
  since: ISODate;
  boosterUntil?: ISODate; // temporary booster period after disruption
  confirmedBy?: { parentId: ID; childAssent: boolean };
}

export type SubmissionStatus =
  | 'submitted'
  | 'needs_look'
  | 'approved'
  | 'retry'
  | 'withdrawn'
  | 'help';

export type HelpKind = 'need_help' | 'too_hard' | 'something_changed';

export interface AIResult {
  recommendation: 'looks_ok' | 'needs_look';
  confidence: number; // 0..1
  explanation: string;
  signals: string[];
  model: string;
  version: string;
  at: ISODate;
}

export interface Submission {
  id: ID;
  familyId: ID;
  taskId: ID;
  childId: ID;
  dateKey: DateKey;
  status: SubmissionStatus;
  proofMethod: ProofMethod;
  proofBlobId?: ID; // raw media in `media` table; deleted after resolution by default
  proofHash?: string; // perceptual hash kept after raw deletion
  proofMime?: string;
  ai?: AIResult;
  help?: HelpKind;
  note?: string;
  submittedAt: ISODate;
  resolvedAt?: ISODate;
  resolvedBy?: ID; // member id, or 'ai'
  autoApproved?: boolean;
  auditSample?: boolean; // selected for the ~10% audit
  feedback?: string; // Praise Coach output chosen by the parent
  appeal?: { reason: string; at: ISODate; status: 'open' | 'upheld' | 'declined'; resolvedAt?: ISODate; note?: string };
  ledgerEntryId?: ID;
  reminderCount: number;
  independentStart: boolean; // completed without a reminder
  nonce?: { code: string; issuedAt: ISODate; expiresAt: ISODate };
  repsClaimed?: number;
  repsCounted?: number;
  reflection?: { kind: ReflectionKind; text?: string; mediaId?: ID };
  cameraClip?: { cameraId: string; requestedAt: ISODate; seconds: number };
}

export type ReflectionKind = 'retell' | 'drawing' | 'passage' | 'note' | 'quiz' | 'conversation' | 'selflog';

export interface Media {
  id: ID;
  familyId: ID;
  blob: Blob;
  mime: string;
  createdAt: ISODate;
}

export type LedgerKind =
  | 'earn'
  | 'bonus'
  | 'milestone'
  | 'redeem'
  | 'goal_save'
  | 'goal_refund'
  | 'reversal'
  | 'adjust';

export interface LedgerEntry {
  id: ID;
  familyId: ID;
  childId: ID;
  kind: LedgerKind;
  amount: number; // signed; balance never goes below zero
  basePoints?: number;
  eligibleForBoost?: boolean;
  coefficient?: number;
  reason: string;
  refType?: 'submission' | 'reward' | 'goal' | 'ledger' | 'week';
  refId?: ID;
  approverId?: ID;
  configVersion?: number;
  createdAt: ISODate;
}

export type RewardSection = 'quick' | 'save_for' | 'family' | 'extra_job_money';

export interface Reward {
  id: ID;
  familyId: ID;
  title: string;
  emoji: string;
  section: RewardSection;
  cost: number;
  availability: 'always' | 'weekend' | 'scheduled';
  weeklyBudget?: number; // max redemptions per week
  childIds?: ID[]; // empty = all
  status: 'active' | 'proposed' | 'archived';
  proposedBy?: ID;
  createdAt: ISODate;
}

export interface Redemption {
  id: ID;
  familyId: ID;
  rewardId: ID;
  childId: ID;
  cost: number;
  status: 'requested' | 'approved' | 'fulfilled' | 'declined';
  ledgerEntryId?: ID;
  createdAt: ISODate;
  resolvedAt?: ISODate;
}

export interface Goal {
  id: ID;
  familyId: ID;
  childId: ID;
  title: string;
  emoji: string;
  targetPoints: number;
  savedPoints: number;
  milestones: number[]; // hit: 25, 50, 75, 100
  primary: boolean;
  status: 'active' | 'reached' | 'abandoned' | 'proposed';
  createdAt: ISODate;
}

export interface CoopGoal {
  id: ID;
  familyId: ID;
  title: string;
  emoji: string;
  targetCount: number; // number of coop-tagged completions
  contributions: Record<ID, number>; // private per child; only own value shown to a child
  status: 'active' | 'reached' | 'archived';
  celebration?: string;
  createdAt: ISODate;
}

export interface MomentumState {
  id: ID; // childId
  familyId: ID;
  childId: ID;
  levelKey: string;
  since: ISODate;
  candidateLowerKey?: string; // lower level observed; applied only after grace + review
  candidateSince?: ISODate;
  pausedForReview: boolean;
  lastReviewAt?: ISODate;
  lastWeekClosed?: DateKey; // Monday of the last closed week
}

export type IncidentStatus = 'pause' | 'understand' | 'repair' | 'support' | 'closed';

export interface Incident {
  id: ID;
  familyId: ID;
  childId: ID;
  ruleId?: string;
  description: string;
  status: IncidentStatus;
  createdBy: ID;
  createdAt: ISODate;
  coolingOffUntil: ISODate;
  causes: string[]; // unclear expectations, missing skill, overload, fatigue, stress, unrealistic task
  repairPlan?: string;
  support?: string;
  responseCost?: { privilege: string; until: ISODate };
  childExplanation?: string;
  appeal?: { reason: string; at: ISODate; status: 'open' | 'upheld' | 'declined' };
  closedAt?: ISODate;
  undoneAt?: ISODate;
}

export interface Agreement {
  id: ID; // familyId
  familyId: ID;
  version: number;
  intro: string;
  rules: { id: string; text: string; relatedPrivilege?: string }[];
  reviewEveryWeeks: number; // 4..6
  nextReviewAt: ISODate;
  assents: { memberId: ID; at: ISODate; version: number }[];
  changeRequests: { id: ID; memberId: ID; text: string; at: ISODate; status: 'open' | 'accepted' | 'declined' }[];
  updatedAt: ISODate;
}

export interface AuditEntry {
  id: ID;
  familyId: ID;
  actorId: ID | 'ai' | 'system';
  action: string;
  targetType: string;
  targetId?: ID;
  before?: unknown;
  after?: unknown;
  childExplanation?: string;
  createdAt: ISODate;
}

export interface Reflection {
  id: ID;
  familyId: ID;
  childId: ID;
  refType: 'milestone' | 'goal' | 'week';
  refId?: ID;
  difficulty?: 'easy' | 'okay' | 'hard';
  whatHelped?: string;
  whatToChange?: string;
  createdAt: ISODate;
}

export interface Kudos {
  id: ID;
  familyId: ID;
  fromId: ID;
  toId: ID;
  text: string;
  createdAt: ISODate;
}

export interface Session {
  memberId: ID;
  familyId: ID;
  role: Role;
  isSupervisor: boolean;
  isSuperUser: boolean;
  elevatedUntil?: ISODate; // super-user elevation for role/recovery changes
}

export type MoneyKind = 'earn' | 'payout' | 'interest' | 'move' | 'spend' | 'give';
export type Jar = 'save' | 'spend' | 'give';

export interface MoneyEntry {
  id: ID;
  familyId: ID;
  childId: ID;
  kind: MoneyKind;
  amount: number; // signed, in currency units
  jar: Jar; // jar affected (for 'move', the destination; a paired negative row hits the source)
  reason: string;
  refType?: 'submission' | 'task' | 'money';
  refId?: ID;
  settled: boolean; // payout marked when settled in cash or transfer
  createdAt: ISODate;
}

export interface Reminder {
  id: ID;
  familyId: ID;
  childId: ID;
  taskId: ID;
  dateKey: DateKey;
  kind: 'window_open' | 'closing_soon' | 'parent';
  createdAt: ISODate;
}

export interface CameraEvent {
  id: ID;
  familyId: ID;
  childId: ID;
  taskId: ID;
  cameraId: ID;
  status: 'requested' | 'received' | 'failed';
  seconds: number;
  createdAt: ISODate;
  note?: string;
}

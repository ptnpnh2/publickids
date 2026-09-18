# Architecture

Kids Incentives plan, MVP through V2 (software parts).
Stack: **Vite + React 19 + TypeScript**, Tailwind v4, Dexie (IndexedDB), i18next, react-router, zustand, vite-plugin-pwa.

```
src/
  domain/      pure rules, no I/O (economy, momentum, stages, consequences, verification, praise, digest, phash, time)
  db/          Dexie schema — table names mirror supabase/migrations/0001_init.sql
  services/    use-cases that read/write the DB and write the audit log
  hooks/       live queries (dexie-react-hooks)
  components/  UI primitives, celebration, shell/nav
  pages/       auth/, kid/, parent/
  i18n/        en / uk / es
supabase/
  migrations/0001_init.sql   Postgres schema + RLS + append-only triggers
  functions/verify-proof/    Edge Function: provider-agnostic AI pre-screen (keys server-side)
```

## Data flow
1. Child opens **Today** (`pages/kid/Today.tsx`): tasks scheduled for today are split into Now / Later / Done by window.
2. **Task detail** shows the Success Card and one main action. `services/submissions.submitTask` stores the proof
   (photo resized + pHashed on-device in `services/media.ts`), runs the verification gateway if enabled, and either
   leaves the submission for a human or auto-approves (mode 3 rules in `domain/verification.ts`).
3. **Approvals** (`pages/parent/Approvals.tsx`): batch approve, Praise Coach, retry, help routing, appeals, audit samples,
   redemptions and child proposals. `approveSubmission` writes an append-only `ledger` row, deletes the raw proof,
   unlocks avatar cosmetics and contributes to the co-op goal.
4. **Housekeeping on app open** (`App.tsx`): refresh momentum level, close past weeks (weekly bonus rows), sweep old media.

## Local-first vs. Supabase
The app is fully usable offline on one device per child/parent (data lives in IndexedDB). Multi-device sync and
server timestamps require the Supabase project described in `supabase/`. `src/services/verification.ts` already
switches to the Edge Function when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set. A sync adapter for
the Dexie tables is the next backend step (the SQL schema and RLS policies are ready but untested against a live project).

## Verification gateway
`verifyProof(type, media, taskRules)` → `AIResult { recommendation, confidence, explanation, signals, model, version }`.
Cascade: local heuristics (duplicate pHash, blank/very small image) → remote model only when local checks are clean →
abstain (`needs_look`, low confidence) on any outage. Never a rejection.

## Momentum / Consistency Boost
`domain/momentum.ts`: rolling-window stats over scheduled commitments (sick days, vacation, app-free days and days
before a Fresh Start excluded), level evaluation, promotion/grace rules, config validation and forecast.
`services/momentum.ts`: weekly close writes a `bonus` ledger row = eligible × (coef−1), rounded once, capped.

## V2 modules
- `domain/money.ts` + `services/money.ts`: separate money ledger (jars, interest, payouts); Dexie table `money`, SQL `money_ledger`.
- `domain/nonce.ts`: fresh on-screen challenge for video proofs; caps on clip length/size.
- `domain/camera.ts` + `services/camera.ts` + `gateway/`: optional IP-camera connector, event clips only, guardrails (zones, consent, assent, window, daily limit).
- `domain/reading.ts`: occasional reading reflection (child-chosen kind), soft plausibility signals.
- `domain/quests.ts`: non-expiring seasons, creatures, gear and castle tiles (monotonic unlocks).
- `domain/balance.ts`: advanced System Balance Review metrics over 8 weeks.
- `domain/reminders.ts` + `services/reminders.ts`: bounded reminders (quiet hours, holiday mode, fading in Independence Mode).

## Not in this build (per plan)
Capacitor shells, device attestation and store submission (manual items); LMS/school integrations, moderated
template marketplace and extended-family sponsor funding flows (V3). The Supabase sync adapter still needs a live project.

# Kids Incentives — product invariants (read before changing anything)

This file distills §1 of the development plan (docs/spec.md) into rules the code must never break.
When a feature request conflicts with these, the invariant wins and the request is renegotiated.

## Non-negotiable product rules
1. **Points are a temporary scaffold, not payment.** Every point-earning habit has a visible stage
   Learning → Practicing → Independent → Graduated; graduated habits earn acknowledgment only.
2. **Max 3 habits per child earn frequent points at once** (`settings.activeTrainingCap`). Warn, don't silently allow.
3. **Never systematically reward** kindness, honesty, affection, eating quantity, weight, toileting,
   emotional states, or raw grades. Never make family time, meals, sleep, privacy, education, health or
   belonging conditional or purchasable.
4. **Ledger is append-only and never negative.** Corrections are `reversal` rows. Consequences never
   touch points, goals, purchased rewards or historical earnings.
5. **Consequences follow Pause → Understand → Repair → Support → Close.** Response cost is off by default,
   parent-only, bounded (≤48h), and may only pause a small pre-agreed privilege. **Never issued by nanny or AI.**
6. **AI never rejects, accuses, labels dishonesty or applies a consequence.** It returns
   `looks_ok | needs_look` with confidence and a written explanation; doubts go to a human; the child sees
   neutral language and always has "This is incorrect" / "Try another proof" / "Ask parent".
7. **Auto-approval (mode 3)** only after `autoApproveMinHistory` successful manual reviews on an
   auto-eligible task, confidence ≥ 0.85, clean signals, with a ~10% audit sample and child appeal.
8. **Consistency Boost is positive-only by default** (×1.00–×1.15), weekly bonus = eligible × (coef−1),
   rounded once, capped (15%), never compounded, never on money jobs / repair / graduated habits.
   Promotion is immediate, one level at a time; a lower level only after a 14-day grace **and** a
   parent-child review. Supervisor values <1.00 or >1.25 require warning, forecast, explicit confirmation.
9. **No dark patterns:** no random reward chests, variable-reinforcement, streak destruction, companion
   sadness/decay, FOMO, scarcity, public leaderboards, sibling rank order, shame copy or failure sounds.
   Thinning at the Independent stage is predictable ("every 2nd time"), never random.
10. **Privacy by default:** no bathroom/bedroom/eating/health proof templates (`isSensitiveTask`), raw
    proofs deleted after resolution, only a perceptual hash and the AI note retained.
11. **Roles:** nanny approves ordinary routines up to a limit, never rewards/penalties/money/security.
    Sponsor funds approved rewards and sends kudos only. Role and recovery changes need the super-user.
12. **Children see explanations**, not verdicts: every settings/stage/momentum change carries a
    `childExplanation` in the audit log.
13. **Money is a separate ledger** for extra jobs only (`money` table, jars), never for grades, kindness or
    baseline chores, and never mixed with points.
14. **Camera proof is off by default**, event-clip only, never sensitive zones (`zoneAllowed`), needs parent
    consent and child assent, proves *what* happened in view never *who*, and a phone/self-check alternative always exists.
15. **Quests and seasons never expire or decay**; unlocks are monotonic.

## Engineering conventions
- Domain rules live in `src/domain/*` as pure functions with tests; services in `src/services/*` touch the DB.
- Local-first: Dexie (IndexedDB). `supabase/migrations` mirrors the same shape for a synced backend.
- i18n-first: every user-facing string is a key in `src/i18n/{en,uk,es}.json`. Keep the three files in parity.
- Run `npm run typecheck && npm test && npm run build` before pushing.

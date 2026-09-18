# Kids Incentives Web-App — Development Plan (product sections)

Source: Notion page "Kids Incentives Web-App — Development Plan" (build-strategy comparisons omitted).

> 
A practical, low-friction family app that helps children learn chores, routines, school habits, and responsible behavior through clear expectations, bounded choice, temporary incentives, kind feedback, and gradual independence — with proportionate AI assistance and parent control.



> 
**Format**
Hybrid: PWA-first, Capacitor native shells from V1.2 (§3.1)



> 
**Core loop**
Choice + skill-building + temporary points + graduation (§1)



> 
**Languages**
UA / ES / EN at launch; i18n-first for more later (§2.7)



> 
**AI verify cost**
~$1–5 per family/month, photo-dominant (§6)



---


# 1. 🧠 Psychology foundation
Every feature below is derived from these principles. Treat this section as the product's "constitution" — when in doubt, features must comply with it.
## 1.1 The core loop: understand → teach → support → reinforce → graduate 
Token economies are useful, but in this product they are a **temporary motivational scaffold**, not payment for every family responsibility forever. Before adding points, the app checks whether the task is understood, developmentally feasible, practiced, and supported by the environment.
- **Start small** — default to 3–5 active tasks and no more than 3 habits earning frequent points at once.
- **Make success concrete** — "put clothes in the basket before dinner", not "be responsible".
- **Teach before judging** — visual examples, micro-steps, practice, and a "Need help" path come before consequences.
- **Use age-appropriate feedback** — immediate for younger children or new skills, then gradually thin or delay points as independence grows.
- **Pair points with authentic acknowledgment** — the relationship and the natural benefit of the task should eventually carry the behavior.
- **Graduate the support** — transfer from points → intermittent bonus + feedback → self-tracking → normal family routine.
## 1.2 Protect intrinsic motivation (the overjustification effect) 
Rewards can help children begin low-interest or difficult routines, but they must not turn every family action into a transaction. Design rules:
- Reward **selected new routines, practice, strategy, and improvement** — not activities the child already loves and not affection, kindness, honesty, eating volume, or emotional states.
- Reward **controllable processes**, not identity or raw outcomes ("followed the study plan" rather than "got an A").
- Use four visible support stages: **Learning → Practicing → Independent → Graduated**. A parent and child confirm each transition together.
- Do not use a fixed habit countdown. Graduation depends on stable completion across normal disruptions, reduced prompting, child feedback, and a short reward-light trial; temporary booster periods are normal after illness, travel, or stress.
- Keep bonuses predictable and transparent. Non-contingent family appreciation is welcome; random reward chests and variable-reinforcement mechanics are not.
## 1.3 Self-Determination Theory — the design compass 
SDT (Deci & Ryan): motivation and well-being require **autonomy, competence, relatedness**. Map every feature to one of these:
| Need | Product translation |
|---|---|
| **Autonomy** | Kids choose *which* tasks to take on, *when* (within windows), and *what* rewards to aim for; they can propose their own tasks and rewards for parent approval |
| **Competence** | Clear micro-steps, attainable difficulty, visible skill progress, flexible consistency windows, personal improvement, and habit-graduation milestones |
| **Relatedness** | Unconditional family connection, authentic parent feedback, private child progress, optional co-op goals, and shared celebrations that never gate ordinary family time |

## 1.4 Feedback: specific, sincere, and autonomy-supportive 
Praise is most useful when it gives accurate information without becoming controlling or automatic. The app should:
- Ship a **Praise Coach** with three editable options: a specific observation, strategy recognition, and a reflection question.
- Prefer "You remembered all three steps without a reminder" over generic "Amazing job!" or trait labels such as "You're so smart".
- Do not praise effort mechanically when a strategy did not work; help the child choose a better strategy instead.
- Allow neutral acknowledgment and personal voice messages so feedback remains authentic rather than AI-generated praise spam.
## 1.5 Money vs. points — the two-tier chore model 
Parenting/financial-literacy research converges on: **don't pay for baseline family contributions** (it teaches "I only help if paid"), but paid "extra jobs" are fine. Recommended model:
- **Family contributions** (make bed, set table) → acknowledgment by default; optional temporary points while the routine is being learned, then planned fading, framed as "we're a team".
- **Extra jobs** (wash the car, weed the garden) → can earn money/allowance.
- Optional **allowance module** kept *separate* from chores, for teaching budgeting (save / spend / give jars, savings "interest" paid by parents).
**Explicit category split — tokens vs. money vs. nothing (overjustification-aware):**
| Category | Currency | Why |
|---|---|---|
| Self-care & baseline family contributions (teeth, bed, set table, tidy own room) | Acknowledgment by default; temporary tokens only during learning, with planned fading | Must become identity ("what our family does"), not permanent paid labor; the system visibly graduates the routine away from points |
| Routines & school effort (homework routine, practice, reading routine) | Tokens only, effort-based; never money per grade | Money-for-grades has the clearest evidence of motivation collapsing once payment stops; reward the process, fade as habits form |
| Extra jobs beyond baseline (wash the car, weed the garden, one-off projects) | **Money-eligible** — parallel money ledger, optional token top-up | Mirrors real work-for-pay; teaches earning and budgeting; low psychological risk because these were never expected duties |
| Prosocial behavior (kindness, helping a sibling, honesty) | Never systematically rewarded — kudos and occasional surprise recognition only | Paying for kindness corrupts the motive and invites performative gaming; non-contingent surprises are safe |
| Activities the child already loves | Nothing — track, don't reward | Textbook overjustification: rewards would *reduce* existing intrinsic motivation |

**Never conditional or purchasable:** affection, routine 1:1 parent time, meals, sleep, privacy, education, health care, ordinary family belonging, physical affection, or access to basic movement and friendships. Do not reward eating quantity, weight, toileting, emotional suppression, medication without clinical guidance, or systematic kindness/honesty.
The optional money ledger stays separate from points and applies only to clearly defined extra jobs. It records earned / paid out / saved, with payouts marked when settled in cash or by transfer.
## 1.6 Consequences: repair, learning, and logical follow-through 
Consequences exist to teach and restore—not to lower a child's status or erase success.
**Hard-coded product rules:**
# 1. Default flow is **Pause → Understand → Repair → Support → Close**. The child never has to "earn back" family standing.
# 2. Before a consequence, check whether the behavior came from unclear expectations, missing skills, sensory overload, fatigue, stress, or an unrealistic task.
# 3. Point loss is **off by default**. If a parent enables response cost, it may affect only a small, pre-agreed privilege directly related to the rule; never long-term goals, purchased rewards, basic needs, or negative balances.
# 4. Add an adult cooling-off delay, a child-visible explanation, an appeal/retry path, and a one-tap undo.
# 5. A correction-heavy weekly pattern triggers coaching to simplify expectations and reconnect; do not present any praise-to-correction ratio as a universal scientific quota.
# 6. No AI- or nanny-issued consequences, public red zones, shame copy, failure sounds, sibling comparison, or loss of already-earned progress.
## 1.7 Progress and co-operation — private, flexible, and recoverable 
- ✅ **Personal progress is optional**: consistency windows such as "5 of 7 mornings", fewer reminders, skill stages, and personal bests without a catastrophic reset.
- ✅ **Family co-op goals** use private contributions, flexible roles, adjustable targets, and no blame or collective punishment.
- ✅ Challenges require each child's assent and compare percentage improvement or contribution type—not absolute points.
- ✅ Ordinary family time and food never depend on reaching a co-op target; celebrations are optional extras that do not replace regular connection.
- ❌ No public sibling levels, permanent leaderboards, visible rank order, or default head-to-head competition.
## 1.8 Ethical gamification — fun without dark patterns 
Use brief, skippable celebrations, creative customization, stories, and visible mastery—not compulsion. Commit to: no artificial scarcity or FOMO, expiring progress, random reward chests, pay-to-progress, infinite scroll, variable-reward mechanics, companion sadness or decay, streak destruction, or manipulative notifications. The app should help children **finish and leave**, not maximize time on screen.
## 1.9 Consistency Boost — a safe version of reward coefficients 
The proposed coefficient idea is retained as a **Supervisor-configurable Consistency Boost**. Recommended defaults are positive-only, while an authorized Supervisor can change the names, coefficients, thresholds, windows, and caps. The system must never label a child as "bad", "good", or morally superior.
| Momentum level | Coefficient | Safe default qualification | Meaning |
|---|---|---|---|
| **Starting** | ×1.00 | Everyone begins and can restart here | Full base points; never a penalty tier |
| **Steady** | ×1.05 | At least 70% of selected commitments across 14 days | An emerging reliable rhythm |
| **Strong** | ×1.10 | At least 80% across 28 days, with fewer reminders | Stable follow-through across normal weeks |
| **Self-Directed** | ×1.15 | At least 85% across 42 days plus one graduated habit | Sustained independence—not a judgment of character |

**Implementation and configuration rules:**
- The names and coefficients in the table are **recommended defaults, not fixed system values**. An authorized Supervisor can rename levels and change coefficients, qualification thresholds/windows, and bonus caps per family or per child.
- Default presets protect base task points and never use a coefficient below ×1.00. If a Supervisor intentionally configures a value below ×1.00 or a high value above ×1.25, the app shows an impact/inflation preview, a psychological-risk warning, and requires explicit confirmation; the change is child-visible and applies only prospectively.
- Calculate the default multiplier as a visible **weekly bonus** on eligible routine and training-habit base points: `weekly bonus = eligible points × (coefficient − 1)`. Round once; never compound multipliers. A Supervisor may change the default 15% weekly cap within Custom settings after reviewing the forecast.
- Exclude money-eligible jobs, grades, kindness/honesty, repair tasks, sensitive routines, and already-graduated habits.
- Promotion uses a rolling window and is celebrated privately. One missed day, illness, travel, or one rule breach never causes immediate demotion.
- A lower level can occur only after a 14-day grace period and a parent-child review, one level at a time; it never removes points already earned.
- Critical safety-rule incidents pause the *bonus* for human review; completing a respectful repair matters more than maintaining a perfect record.
- End-of-year grades do not determine identity or the coefficient. A child-chosen improvement goal, sustained study routine, or major long-term achievement may receive a separate, one-time milestone celebration and capped bonus.
- Child-facing names can be reskinned by theme (for example Launchpad → Orbit → Cruise → Pathfinder), while the underlying neutral Momentum levels remain consistent.


# 2. 🧩 Feature set
## 2.1 Accounts, roles, and adjustable child profiles 
- **Parent/Admin**: uses Simple, Balanced, Independent, or Custom presets; creates tasks and rewards, approves proofs, schedules changes, and sees a compact weekly digest.
- **Co-parent**: full or near-full parent rights with clear change history and undo.
- **Nanny / caregiver**: a ready-made scoped role that sees only assigned children and task types, can approve ordinary routines up to a configurable value, and cannot change rewards, multipliers, consequences, money, or security settings.
- **Supervisor**: an optional behavioral-configuration role, normally assigned to one parent. A Supervisor can rename Momentum levels, change their coefficients, qualification thresholds/windows, and weekly bonus caps, and publish family- or child-specific versions. Every change is previewed, logged, prospective, and explained to the child in age-appropriate language.
- **Super-user (recovery owner)**: protected by 2FA and offline recovery codes; used only for recovery and role changes, while daily work happens in a normal parent account.
- **Extended-family sponsor**: can fund only parent-approved rewards and send kudos; cannot assign tasks, pressure the child, or see sensitive proofs.
- **Audit trail**: append-only log of approvals, point and Momentum-level changes, settings, logins, and roles. Children see age-appropriate explanations of who approved or changed something.
- **Kid profiles use age bands only as starting presets**, then separately adjust literacy, visual density, audio support, independence, planning horizon, proof complexity, animation intensity, and accessibility:
- **4–6 start**: picture tasks, audio instructions, one primary action, shared-device flow.
- **7–9 start**: simple reading UI, small point economy, optional proof, short goals.
- **10–12 start**: task choice, goal saving, proposals, explanations, and appeals.
- **Teen start**: clean minimal UI, self-planning, optional money ledger, restrained gamification.
## 2.2 Task system — fast for children, light for parents 
- **One Today screen** with **Now / Later / Done** and only 3–5 primary cards visible. A child normally completes or submits a task in 10–20 seconds.
- **Task types**: chores, routines, learning processes, extra paid jobs, and separate repair plans. Do not systematically reward affection, kindness/honesty, eating amount, emotional suppression, or raw grades.
- Each task has a compact **Success Card**: one example image or illustration, up to five micro-steps, estimated time, completion definition, schedule window, proof method, and one main action.
- **Choice-based assignment**: choose one of two chores, finish any two before a window closes, or select a weekly contribution. Children can propose tasks, rewards, or a fair replacement.
- **Help paths**: Need help, Too hard, and Something changed route the parent toward teaching, simplifying, rescheduling, or accommodating—not automatic failure.
- **Simple base values**: default to 1 / 2 / 3 / 5 points based on time, effort, complexity, and independence. Show a child-friendly fairness explanation; age alone never sets value.
- **Active-training cap**: no more than three habits per child earn frequent points at once. Other family contributions use acknowledgment or intermittent reinforcement.
- **Consistency Boost**: eligible base points receive the recommended positive-only weekly coefficient defined in §1.9. An authorized Supervisor may configure different names and coefficients prospectively; below-×1.00 values require explicit warning, forecast, confirmation, and a child-visible explanation.
- **Task marketplace** is reserved for optional extra jobs; money-eligible work stays visibly separate from normal family contributions.
- **Templates and Starter Mode**: age-informed, culturally adaptable templates plus a seven-day setup containing three tasks, two rewards, one goal, and a guaranteed practice success.
## 2.3 AI proof & verification engine (your idea #1) 
**Trust-first flow:** child self-checks or submits the least burdensome acceptable proof → optional AI pre-screen → parent receives a concise summary → human approval by default. The proof ladder is **self-check / no proof → parent observation → photo → audio → video**; requirements decrease as trust and habit stability grow. AI never rejects, accuses, applies a consequence, or labels dishonesty.
| Proof type | Use case | Best-in-class models (primary → fallback) |
|---|---|---|
| **Photo** (before/after) | Cleaned room, made bed, completed a craft or household task; never eating quantity or sensitive self-care | Gemini (top multimodal vision) → GPT-5 vision; cheap tier: Qwen-VL |
| **OCR / handwriting** | Graded tests, homework, school diary | Gemini leads handwriting benchmarks; GPT-5 mini best accuracy on handwritten forms; Qwen-VL / DeepSeek for low-cost bulk |
| **Audio** | Reading aloud, music practice, language drills | Soniox (top accuracy + low latency real-time) or ElevenLabs Scribe (multilingual — covers UA/ES/EN and future languages) → Whisper/GPT-4o-transcribe |
| **Video** | Exercise and repetition counting (including optional Synology camera clips), pet care, instrument practice | Gemini — only frontier model with *native* video+audio understanding; others sample frames |
| **Judgment/feedback** | Turning raw recognition into kind, structured feedback | Claude or GPT-5 (instruction-following, tone safety); DeepSeek/GLM/Kimi as cost-optimized routing tier |

**Architecture: a model-routing and child-safety layer**, not hard-wired vendors:
- **Cascade for cost**: inexpensive checks handle clear cases; ambiguous cases escalate; the parent receives "needs a look" rather than a machine accusation.
- **Proof minimization**: each task uses the least intrusive method that works, and the app recommends reducing proof as trust develops.
- **Anti-spoofing**: freshness tools are reserved in proportion to stakes; nonce challenges and video are not routine requirements for ordinary chores.
- **School processing**: OCR may summarize reports, but rewards target child-chosen improvement and controllable study processes—not grades as identity or permanent multiplier criteria.
- **Privacy by default**: visible capture, no bathroom/bedroom/eating or sensitive-health proof templates, on-device pre-checks where feasible, encrypted transit, shortest feasible retention, and raw proof deletion after resolution.
- **Governance**: child-rights and data-protection impact assessments, versioned model evaluations, subgroup testing across age/language/accent/disability/skin tone/device quality, abstention thresholds, and child-friendly appeal and redress.
### Freshness & anti-cheat: honest feasibility assessment 
Goal: proof must be fresh, unique, and captured now — not pre-recorded or reused. What each mechanism actually delivers:
| Mechanism | Reality | How a motivated 12-year-old beats it | Verdict |
|---|---|---|---|
| In-app capture only, gallery upload disabled | Enforceable only in the native shell (Capacitor camera pipeline). Mobile browsers can't reliably restrict picker sources; desktop browsers accept virtual cameras (OBS) | Films an old video playing on a second screen; borrows a sibling's device; on web, installs a virtual camera | Baseline in the native app (§3.1); web submissions marked lower-trust |
| Server-side timestamps (never device clock) | Trivial and 100% reliable — but only for *submission* time; proves nothing about *capture* time by itself | Records earlier, submits inside the window (closed only when combined with in-app capture) | Always on; kills clock manipulation, nothing more |
| EXIF / metadata checks | Weakest link: EXIF is stripped or edited in minutes with free tools, and legit captures often lack it | Googles "EXIF editor" | Anomaly signal only — never treat as proof |
| Perceptual hashing (pHash) vs. all prior family proofs | Cheap and solid against resubmitting the same, cropped, or re-compressed media | Batch-shoots 10 slightly different photos of the once-cleaned room, drip-feeds them over weeks | On by default; pair with AI scene-consistency checks (same bedding? lighting matches claimed time of day?) to catch staging |
| Randomized on-screen challenge (nonce): app reveals a word/number at task start; kid says it or shows it on paper at required checkpoints; AI verifies | **Strongest practical freshness proof** — same principle as KYC liveness. Pre-recorded media cannot contain a nonce issued seconds ago | Freshness: very hard to fake. But it proves *when*, not *who*: an off-camera sibling can do the push-ups while the cheater speaks the nonce | Reserve for optional higher-value video proofs in V2; do not require it for ordinary daily chores |
| Device attestation (Play Integrity / App Attest) | Native-only; proves an unmodified app on a genuine device; blocks emulators and most virtual-camera injection | Realistically out of reach for a 12-year-old (requires rooting + spoofing); documented bypasses exist for experts | Add with native shells (V1.2) as a silent trust signal |
| Optional IP-camera event clip (e.g. Synology) | A fixed safe-zone camera can objectively timestamp and count visible repetitions such as push-ups, reducing repeated parent review; it proves an action occurred in view, not who did it | Another person can perform the exercise; bodies can be occluded; a poor angle can miscount; a compromised camera system can spoof the feed | Implement in V2 for selected low-stakes tasks, short event clips only, high-confidence auto-approval with random audits and an alternative proof path |
| C2PA Content Credentials (cryptographic capture provenance) | The "right" long-term answer; phone hardware/OS support is still nearly nonexistent | N/A — can't be deployed yet | Track the standard; don't build on it in 2026 |

**Bottom line (no marketing)**: no technical stack reliably proves who performed a task. Use stronger freshness checks only when the reward and risk justify the burden. The default backstop is a trust-based family review, a retry or repair path, and adjustment of future proof requirements—never automatic clawback of protected progress or a machine accusation.
### AI doubt flags 
Every verification returns the adult a recommendation, confidence, and written explanation. Doubts route to a human. The child sees only neutral language such as "needs a parent's look" plus **This is incorrect**, **Try another proof**, and **Ask parent** actions. Correcting an AI error restores the intended reward and records the error for quality monitoring.
### Verification modes (parent-configurable per task type) 
# 1. **Full manual** — AI off or silent; a human reviews the raw proof.
# 2. **AI analysis + human confirmation** (default) — AI verdict and reasoning attached; approver confirms with one tap.
# 3. **AI auto-approval** — offered only after a successful manual-review history for a low-stakes task; high confidence and clean signals required, with a parent-set cap, ~10% audit sample, weekly digest, and child appeal.
### Who can approve what 
| Task tier | Examples | Minimum approver |
|---|---|---|
| Auto-eligible | Daily routines, low-value repeat chores | AI auto-approve (mode 3, audited) |
| Caregiver-level | Standard chores, routine check-offs | Nanny or parent |
| Parent-only | School results, money-eligible extra jobs, long-term-goal milestones | Parent |
| Sensitive | Penalties/response-cost, economy changes, role changes, recovery | Parent for penalties; super-user for roles and recovery |

Penalties can never be issued by the nanny or by the AI.
### Reading verification (book-aware, optional, and multimodal) 
Upload PDF/EPUB/TXT when useful, then let the child choose an occasional reflection: oral retelling, drawing, favorite passage, one-sentence note, short quiz, parent conversation, or simple self-log.
- Compare content only when verification is genuinely needed; never score accent, speaking confidence, expressive-language style, or age-normal reading speed as honesty.
- Use no-repeat and plausibility checks as soft adult signals, not automatic judgments.
- Do not require reflection after every reading session—the feature must not turn reading into a recurring test.
- Reward the routine only for a reluctant reader who needs scaffolding. If the child already reads for pleasure, track or celebrate without points.
### Optional IP-camera verification (e.g. Synology) 
Implemented in V2 for selected, objective proof types where a short camera event can save repeated parent review—for example push-ups, squats, a short exercise set, or another clearly defined action inside a configured safe zone.
**Flow:** the parent enables a specific camera for a specific task and maps the allowed zone → the child taps **Start camera proof** → a visible countdown and recording indicator appear → the app requests only a short 10–60 second event clip or snapshots through a scoped connector → AI checks the defined action or counts repetitions → high-confidence, low-stakes results can auto-approve → uncertain cases go to a parent. Parents receive a weekly digest and random audit sample instead of reviewing every submission.
**Non-negotiable guardrails:**
- Off by default and configured per task, child, camera, zone, time window, clip length, daily limit, and approval mode.
- Parent consent plus age-appropriate child assent; an alternative self-check, wearable, phone video, or manual proof method is always available.
- Event-triggered capture only—no continuous ingest, camera-history browsing, background monitoring, or open live-stream access from the app.
- Never enable bedrooms, bathrooms, dressing areas, eating verification, or other private/sensitive zones. Show a persistent child-visible indicator whenever the connector is active.
- Use a read-only, least-privilege Synology Surveillance Station API account or local gateway; encrypt transport; prefer on-premise preprocessing; delete raw clips immediately after resolution by default; never train models on them.
- No face identification, emotion recognition, or claim about *who* performed the action. The system verifies only that the configured action appears to occur in the zone and time window.
- AI never rejects or penalizes. Low confidence, occlusion, uncertain repetition count, or suspected mismatch produces **Needs a parent's look** or offers another proof method.
- Video duration and AI-cost caps are enforced; the app reports estimated parent time saved, auto-approval accuracy, appeals, and privacy events.
## 2.4 Rewards & economy — simple, transparent, and designed to fade 
- **Three layers only**: authentic appreciation, one points currency, and one active long-term goal. The optional money ledger remains separate for extra paid jobs.
- **Instant feedback**: brief child-selected celebration after approval; routine feedback stays under two seconds and never blocks leaving the app.
- **Reward store sections**: Quick, Save For, Family-Created, and Extra-Job Money. Parents set cost, availability, budget, and redemption timing; children can propose rewards.
- **Unconditional connection**: regular parent time, affection, meals, ordinary family outings, health, education, privacy, and belonging are never store items.
- **Focused goals**: one primary and one optional secondary goal, with 25/50/75% milestones and an estimate based on normal weeks—not grinding.
- **Consistency Boost**: §1.9 provides recommended ×1.00–×1.15 defaults. A Supervisor can rename levels and change coefficients, thresholds, windows, and caps; unusual settings receive warnings and an economy-impact forecast.
- **Visible fading stages**: Learning → Practicing → Independent → Graduated, confirmed by parent and child; booster periods are available after disruption.
- **Money learning**: optional save / spend / give jars and parent-funded interest, without money-for-grades.
- **No random bonus chest**: use predictable milestone feedback and occasional non-contingent family appreciation instead.
## 2.5 Game layer — joyful, brief, and non-manipulative 
- **Avatar/companion** unlocks cosmetics, rooms, stories, and creative tools; it never becomes sad, hungry, injured, or downgraded after missed tasks.
- **Celebration controls**: child chooses Quiet, Fun, or Big Moment; routine effects are brief and skippable, with sound-off and reduced-motion options.
- **Non-expiring themes**: monthly visual themes and optional quests remain available later—no FOMO, scarcity, or lost progress.
- **Co-op adventures**: private contributions, flexible roles and targets, no blame, and no ordinary family time or food gated by completion.
- **Momentum levels**: §1.9 levels remain private, describe current consistency rather than identity, and can use child-selected theme names.
- **Consistency windows**: "5 of 7" and personal improvement replace brittle streak resets; include sick days, vacation mode, and Fresh Start.
- **Teen mode**: clean planning and goal UI with optional restrained animation and no childish companion.
## 2.6 Repair and family agreements 
Use the §1.6 **Pause → Understand → Repair → Support → Close** flow. Point loss is off by default; AI and caregivers cannot issue consequences. Adults receive a cooling-off delay, undo, and coaching when corrections become frequent.
The family agreement uses plain language, real choices, and age-appropriate assent—not a symbolic forced signature. Children can request a change or appeal, and the family reviews agreements every 4–6 weeks. Repair closes the issue; it does not restore moral status or erase protected progress.
## 2.7 Supporting components 
# 1. **Weekly three-card parent digest**: What worked, Where friction appeared, and One suggested adjustment. Target less than 2 minutes of parent administration per day.
# 2. **System Balance Review**: reports observable patterns such as point negotiation, high-proof burden, or declining independent starts; it never claims to detect laziness, honesty, personality, mood, or intrinsic motivation.
# 3. **Optional child reflection**: one tap after milestones—Easy / Okay / Hard, What helped?, or What should change?—not after every task.
# 4. **Ten-minute family onboarding + seven-day Starter Mode**: choose 3 tasks, 2 rewards, 1 goal, a theme, and celebration style; finish with a practice success.
# 5. **Universal accessibility settings**: micro-steps, visual schedules, audio, simplified language, larger targets, reduced motion, high contrast, fewer choices, extra processing time, and alternative proofs—available without a diagnosis.
# 6. **Multilingual, i18n-first**: UA / ES / EN launch, RU deferred; per-child language, externalized strings, locale-aware plurals/dates, and culturally adaptable templates.
# 7. **Bounded reminders**: routine-linked wording, one child reminder per task by default, snooze/skip, quiet hours, school/holiday modes, and Remind parent instead. No engagement-bait notifications.
# 8. **Offline-capable PWA**: cache Today, task instructions, reward balances, and queued proofs; show sync state and never require a child to redo completed work after connection failure.
# 9. **School integration later**: OCR may summarize reports; LMS APIs remain V3. Goals focus on study process, self-selected improvement, and reflection—not raw-grade multipliers.
# 10. **Safety, privacy, and compliance**: verifiable parental consent where required, high privacy by default, child-visible monitoring, no ads or sale of data, media minimization, review/delete rights, impact assessments, and accessible redress.
# 11. **Parent control presets**: Simple, Balanced, Independent, Custom; live or scheduled changes, preview, undo, child-visible explanations, and AI proposals that never apply silently. A designated Supervisor can edit Momentum names, coefficients, thresholds, windows, and caps; unusual values trigger warnings and an impact forecast. Core protections for basic needs, privacy, protected historical earnings, no shame, and no AI-issued consequences remain non-editable.
# 12. **Parents-only guidance**: concise family rules plus one rotating evidence-based tip, collapsed by default. Include signs that a family should seek a pediatric or mental-health professional instead of relying on the app.
# 13. **Guides that aren't boring**: interactive child tutorial quest; parent quick-start under five minutes; contextual hints rather than a manual.
# 14. **Fresh Start and Independence Mode**: recover after lapses without losing earned progress; add app-free days, printable routines, fading reminders, self-managed plans, and a "graduated from the app" celebration.


# 3. 🏗️ Technical architecture
## 3.1 Product format: hybrid (one web codebase + native shells) 
**Recommendation: hybrid — PWA-first, wrapped with Capacitor into store apps.**
- **Why not web-only**: browsers cannot enforce in-app-capture-only (file pickers and virtual cameras sit outside the app's control) and have no device attestation — a web-only product caps out at weak anti-cheat. Push and camera control on iOS are also second-class for pure PWAs.
- **Why not native-only**: two codebases double cost and iteration time for a small team, and the parent console genuinely wants to be a responsive web app (admin from any laptop).
- **Sequencing**: MVP ships as an installable PWA (fastest to build, runs on hand-me-down tablets, no store review). V1.2 adds Capacitor shells for trusted camera capture, Play Integrity / App Attest device attestation, and reliable push. Kid-side animation and sound run at full fidelity in web tech (Rive/Lottie).
- **Trust-model consequence**: the web flow remains fully usable for self-check, no-proof, parent-observed, and ordinary photo tasks. Native capture and attestation are optional higher-confidence signals for selected higher-value proofs—not a reason to stigmatize routine web submissions.
## 3.2 Stack 
- **Frontend**: React/Next.js installable PWA with a one-screen Today flow, offline task/proof queue, accessible child profiles, and Rive/Lottie + Howler.js behind Quiet / Fun / Big Moment controls; Capacitor shells from V1.2.
- **Backend**: Node/NestJS or Python/FastAPI; PostgreSQL for families, tasks, permissions, and an append-only ledger; Redis for queues; S3-compatible encrypted media storage with lifecycle deletion.
- **Economy ledger**: record base points, eligible Consistency-Boost points, Momentum coefficient, rounded weekly bonus, reason, approver, and config version separately. Never compound multipliers or alter historical earnings when a level changes.
- **AI gateway**: one internal API (`verifyProof(type, media, taskRules)`) routes by capability, price, privacy terms, and tested child-safety performance—not vendor branding. Use cascade routing, abstention, model-version pinning, subgroup evaluations, and per-family budget caps.
- **Privacy-preserving proof pipeline**: on-device resizing and duplicate checks where feasible; visible capture; no sensitive-room templates; raw media deleted after resolution by default; derived hashes and explanations follow explicit minimal retention rules.
- **Optional IP-camera connector (V2)**: Synology Surveillance Station or equivalent through read-only least-privilege credentials/local gateway; per-task safe-zone mapping; short event clips only; no continuous ingest or camera-history browsing; on-premise preprocessing where feasible; strict deletion, cost, audit, and child-visible-status controls.
- **Realtime**: WebSocket/push for approvals and brief celebrations; reminders obey quiet hours and bounded-frequency rules.
- **Auth & accounts**: parent = email/OAuth + 2FA + verifiable-consent step; child = PIN/picture password by default, with optional parent-enabled email login at any age under the applicable consent flow; super-user = separate credentials + offline recovery codes.
- **Audit and redress**: append-only records for approvals, AI/model versions, points, Momentum changes, appeals, settings, logins, and roles; parents can undo permitted changes, while children receive an age-appropriate explanation and correction route.


# 4. 🗺️ Roadmap
| Phase | Scope | Duration (rough) |
|---|---|---|
| **MVP** | Family roles + presets, one-screen Today flow, 3–5 starter tasks, Success Cards, self-check/no-proof/photo options, parent batch approval, one points currency, simple store, one long-term goal, Learning→Graduated stages, two visual themes, offline reliability, privacy controls, EN + 1 language | 8–12 weeks |
| **V1.1** | Audio/OCR, Praise Coach, Repair Flow, consistency windows, child appeals, weekly three-card parent digest, Fresh Start, and a monitored rollout of the ×1.00–×1.15 Consistency Boost after base-economy calibration | +6–8 weeks |
| **V1.2** | Capacitor shells, optional trusted capture + attestation, low-stakes AI auto-approval after successful review history, no-decay avatar, private family co-op adventures, universal accessibility profiles, Independence Mode | +6–8 weeks |
| **V2** | Optional higher-value video proofs with nonce; optional Synology/IP-camera event verification for selected tasks such as push-ups, with short clips, AI repetition counting, high-confidence low-stakes auto-approval and random audits; separate extra-job money ledger; multimodal reading reflection; advanced System Balance Review; non-expiring themes; additional languages | +10–12 weeks |
| **V3** | Process-focused school integrations, parent-approved extended-family sponsors, moderated task-template marketplace, independent child-impact evaluation, more languages | ongoing |



# 5. 📈 Success metrics
- **Low friction**: median child completion/submission under 20 seconds; median parent administration under 2 minutes/day; approval delay visible and declining.
- **Independence (the real goal)**: independent starts, fewer reminders, reward-light completion, graduated habits, successful app-free days, and routines sustained after leaving the app.
- **Family health**: child-reported fairness and stress, parent-reported conflict, repair closure, appeal resolution, and whether family connection remains unconditional.
- **Economy health**: point inflation, task-value disputes, base-vs-bonus ratio, Momentum-level distribution, level-change appeals, and the prevalence and measured impact of Supervisor overrides—especially coefficients below ×1.00 or above ×1.25. Default presets never reduce the same eligible task below ×1.00.
- **Engagement guardrail**: healthy-session completion and Fresh Start recovery; explicitly do not optimize time-in-app, notification opens, point volume, or permanent retention.
- **Proof and AI quality**: proof burden by task, parent agreement, child appeals, false approvals/rejections, abstention rate, subgroup performance, IP-camera repetition-count accuracy, camera-proof auto-approval accuracy, and measured parent-review time saved.
- **Safety and privacy**: media-retention compliance, deletion success, unauthorized access, sensitive-proof attempts blocked, and child-rights impact-review findings.


# 6. ⚠️ Key risks
Each risk is paired with its mitigation, the app feature that delivers it, and the honest residual risk that remains.
| Risk | Mitigation | Delivered by | Residual risk (honest) |
|---|---|---|---|
| **Proof spoofing** (replays, staging, filming a screen, sibling stand-ins) | Trust-first proof ladder; stronger checks only for proportionate stakes; timestamps, pHash, optional nonce, optional short IP-camera event clips for objective actions, AI doubt explanation, child appeal, random audits, and future proof adjustment | Proof ladder, optional camera connector, and redress (§2.3); optional attestation (§3.1) | **High and irreducible.** A stand-in can still perform push-ups in camera view. Camera proof reduces replay risk and parent workload but does not establish identity; technology remains decision support, not proof of character |
| **Kids gaming the economy** (inflation, task farming, coefficient optimization) | Simple 1/2/3/5 values, active-training cap, per-category limits, anomaly alerts, separate base and bonus ledger, no multiplier compounding, and a recommended 15% weekly bonus cap; Supervisor overrides are forecast, confirmed, and audited | Task values (§2.2), Consistency Boost (§1.9), ledger (§3.2) | Low-moderate: children may still cherry-pick easier high-value work. Transparent rebalancing and child appeal are preferable to hidden formula changes |
| **Account compromise** (parent or nanny) + recovery path | 2FA on adult accounts, scoped nanny rights, cold super-user with offline recovery codes, session revocation, forensic audit log | Roles & super-user (§2.1), auth (§3.2) | If the super-user itself is compromised or its codes are lost, in-family recovery is gone — the fallback is vendor support with identity verification. Not engineerable to zero |
| **Kids' photo/video/audio and IP-camera privacy** (storage, home surveillance, retention, jurisdiction) | Verify-then-delete; high privacy by default; IP camera off by default and limited per task/zone; short event clips only; no bedrooms/bathrooms or continuous ingest; read-only scoped connector/local gateway; on-premise preprocessing where feasible; encryption; zero-retention AI tiers; no training; parent/child review and deletion | Camera guardrails and media lifecycle (§2.3), architecture (§3.2), compliance (§2.7-10) | Moderate-high: an IP-camera connector expands the home's attack surface and may feel coercive despite consent. Vendor/API compromise and inference transit cannot be eliminated; families need an equivalent non-camera proof option |
| **AI verification cost** at realistic volume | Proof minimization first; then pHash/on-device checks → inexpensive vision tier → frontier only on doubt; batch non-urgent work and enforce per-family caps. A high-proof family may still cost roughly **$1–5/month** photo-dominant | Trust-first ladder (§2.3), AI gateway + caps (§3.2) | Low if proof requirements fade. Video-heavy use can still reach $10–20/month, so video length and frequency caps remain non-negotiable |
| **Parent abandonment** after weeks 2–3 | Ten-minute onboarding, only 3 starter tasks, one-screen Today, batch approval, bounded notifications, weekly three-card digest, presets, nanny delegation, optional high-confidence camera auto-approval for repetitive proofs such as push-ups, Fresh Start, and a hard target below 2 parent minutes/day | Task UX (§2.2), supporting components (§2.7) | **Real and only partly mitigable.** If adults stop responding, the system loses meaning. Track parent effort, approval delay, Fresh Start success, and 90-day family health—not only retention |
| **Rewards crowd out intrinsic motivation** | Temporary points for no more than 3 active training habits, protected exclusions, Learning→Graduated stages, reward-light trials, positive-only capped multiplier, and System Balance Review | §1.1–1.5, §1.9, §2.4, §2.7-2 | Moderate if adults keep incentives permanently. Safety exclusions are fixed; the app warns strongly and measures reward-free completion, while preserving reasonable parent choice |
| **Sibling conflict from comparison** | Private progress and Momentum levels, no rank order, private co-op contributions, transparent task-value explanations, and assent-based percentage-improvement challenges | Progress design (§1.7), task fairness (§2.2), game layer (§2.5) | Low-moderate: children will still notice differences. The app explains equity and supports review rather than pretending every task is identical |
| **Momentum levels become moral labels or a rich-get-richer system** | Neutral recommended defaults, editable names and coefficients, theme skins, rolling windows, grace period, private display, one-level maximum change, appeal, and explicit warnings/forecasting for below-×1.00 or above-×1.25 Supervisor settings | Consistency Boost (§1.9), economy ledger (§3.2) | Moderate if families treat the level as a judgment of worth. Onboarding and every level screen must state that it describes current support needs and rhythm—not whether a child is good or bad |

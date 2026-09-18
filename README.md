# Kids Incentives

A low-friction family PWA that helps children learn chores, routines and responsible behaviour through clear
expectations, bounded choice, temporary points, kind feedback and gradual independence — with parent control and
proportionate AI assistance. Built from the *Kids Incentives Web-App Development Plan*; this build covers **MVP → V2**.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # domain + service tests (vitest, fake IndexedDB)
npm run build      # production PWA in dist/
```
Open the site on each tablet/phone and choose *Add to Home Screen*. Everything works offline; data stays on the device
until you connect a Supabase project (see `ARCHITECTURE.md` and `.env.example`).

## What's inside
- **Family roles & presets**: parent, co-parent, nanny (scoped, approval limit), sponsor, Supervisor, recovery owner with offline codes; Simple / Balanced / Independent / Custom.
- **Today flow**: Now / Later / Done, 3–5 cards, Success Cards (image, ≤5 micro-steps, time, "done when", window, proof), choice groups, help paths (Need help / Too hard / Something changed).
- **Proofs**: none, self-check, parent-observed, photo (on-device resize + perceptual hash), audio, video; verification modes manual / AI-assisted / AI auto (after review history, audited, appealable).
- **Economy**: append-only points ledger (never negative), 1/2/3/5 base values, store sections (Quick / Save for / Family / Extra-job money), one primary long-term goal with 25/50/75% milestones, child proposals.
- **Support stages**: Learning → Practicing → Independent → Graduated, boosters, graduation signals.
- **Consistency Boost (Momentum)**: ×1.00–×1.15 defaults, weekly capped bonus, grace period + review, Supervisor config with warnings and forecast, child-chosen level skins.
- **Repair flow**: Pause → Understand → Repair → Support → Close, cooling-off, undo, response cost off by default, appeals, correction-heavy coaching.
- **Family agreement**, weekly three-card digest + System Balance Review, Praise Coach, Fresh Start, Independence Mode (app-free days, fading reminders, printable routine, graduation), co-op adventure, no-decay avatar, accessibility profile, audit log.
- **V2**: separate extra-job **money ledger** (save / spend / give jars, parent-funded interest, settle payouts), **nonce video proofs** (fresh on-screen code), **exercise sets** with rep counts (counted on-device by pose tracking and, when a backend is configured, by a server-side video model), optional **IP-camera connector** through a read-only local gateway (`gateway/`), **reading reflection** the child chooses (never every session), **advanced System Balance Review**, **non-expiring seasons/quests and castle**, bounded **reminders**.
- **Languages**: EN / UA / ES. **Themes**: Sunny / Space / Forest / Ocean.

## Repository layout
See `ARCHITECTURE.md`. Product invariants for contributors and coding agents are in `CLAUDE.md`; the condensed
plan is in `docs/spec.md`.

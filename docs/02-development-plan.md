# Development Plan — symb.[zero quebra] Showcase Demo

Internal engineering execution plan. Not for client distribution.
Owner: Tech Lead · Cadence: daily standup · Status board: linked Linear/Jira project.

> **Scope note (v1.1):** Demo is **web-only**. The "mobile team interface" is rendered as a web view inside a phone-shaped frame in the browser, not as a real mobile-device experience. This removes the venue-Wi-Fi sync risk (formerly R1), removes the QR-pairing flow, and lets all four views run as browser tabs on a single laptop. The WebSocket layer remains so views stay in real-time lockstep, but the topology is now `localhost`-only. PT-BR copy and the ~390px phone-frame styling are still mandatory.

---

## 0 · Outcomes this plan must deliver

By the end of execution, four things must be true:

1. A **functional demo** runs from a single command on a clean laptop with Wi-Fi off and passes every line of the brief's Definition-of-Done.
2. A **2-page architecture writeup** is signed off (drafted as `01-architecture-writeup.md`).
3. A **phased delivery timeline** document is signed off (delivers as `03-delivery-timeline.md`).
4. **MP4 fallback recordings** at 1080p, ≤10 min total, covering all 6 steps for Scenario A (mandatory) and Scenario B (preferred), with PT-BR UI throughout.

White-label is a continuous, hard-gated constraint — not a final-week task. Every commit is reviewed against it.

---

## 1 · Stack & tooling (frozen)

| Concern | Tool | Pinned version target |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Bundler / dev server | Vite | 5.x |
| Language | TypeScript | 5.x (strict) |
| UI | React | 18.x |
| State | Zustand | 4.x |
| Routing | React Router (HashRouter) | 6.x |
| WebSocket server | `ws` | 8.x |
| HTTP server | Express | 4.x (serves built `/dist`) |
| Animation | Framer Motion | 11.x |
| Charts | Recharts | 2.x |
| i18n | react-i18next | latest |
| Lint / format | ESLint + Prettier | latest |
| Tests | Vitest + React Testing Library + Playwright (smoke) | latest |
| Packager (optional) | `pkg` | latest |
| Node process manager (dev) | `concurrently` | latest |

Frozen at Sprint 0 close. No new runtime deps after end of Week 2 without tech-lead sign-off.

---

## 2 · Repository structure

```
zero-quebra-demo/
├── package.json              # one-command: "start": "node server/index.js"
├── README.md                 # white-label, no agency name
├── server/
│   ├── index.js              # Express + ws on the same port (4321)
│   ├── eventBus.js           # in-memory pub/sub
│   └── stateStore.js         # last-known state, replay on reconnect
├── data/                     # static JSON, loaded at boot
│   ├── stores.json           # 16 stores; 2 active in demo
│   ├── skus.json             # 40–60 SKUs × 2 stores = 80–120 rows
│   ├── coo_30d.json          # 30 days, declining shrinkage trend
│   ├── learning_loop.json    # 8 weeks: 71% → 94%
│   └── client_figures.json   # operational defaults for calculator
├── src/
│   ├── main.tsx
│   ├── App.tsx               # routes: /, /mobile, /coo, /presenter
│   ├── lib/
│   │   ├── ws.ts             # client WS hook + reconnect
│   │   ├── engine.ts         # decision engine (A/B/C)
│   │   ├── i18n.ts
│   │   └── brand.css         # CSS custom properties for tokens
│   ├── store/
│   │   └── demoStore.ts      # Zustand: scenario, step, selectedSKU, weather, log
│   ├── views/
│   │   ├── Operator/
│   │   ├── Mobile/
│   │   ├── COO/
│   │   ├── Presenter/
│   │   └── ScenarioCalculator/
│   ├── components/
│   │   ├── UrgencyBadge.tsx
│   │   ├── VariablePanel.tsx
│   │   ├── ScenarioSwitcher.tsx
│   │   └── ConnectionIndicator.tsx
│   └── locales/
│       ├── pt-BR.json
│       └── en.json
├── public/
│   ├── fonts/                # self-hosted Work Sans
│   └── qr/                   # generated mobile-URL QR
├── scripts/
│   ├── preflight.js          # fails build if any external URL is referenced
│   ├── whitelabel-audit.sh   # greps repo for forbidden strings
│   └── generate-coo-data.ts  # regenerates 30-day curve with seeded noise
└── tests/
    ├── unit/                 # engine, store, ws hook
    └── e2e/                  # Playwright: full 6-step flow under each scenario
```

---

## 3 · Phased plan

Five phases over ~4.5 calendar weeks. Sprint 0 is the unblocker; Sprints 1–4 each end on a hard demo.

### Sprint 0 — Pre-flight (Days 1–3)

Goal: every dev can land a PR, the prospect's questions are answered, and the dataset is real.

- [ ] Create private GitHub repo; protected `main`, PR review required.
- [ ] White-label setup: empty author fields in `package.json`; `.gitattributes` to scrub committer email on export; `README.md` written without agency name.
- [ ] Vite + TS + React scaffold; commit lockfile.
- [ ] Express + ws skeleton on port 4321 (one process serves SPA + WS).
- [ ] CI: GitHub Actions running lint + typecheck + unit tests on PR.
- [ ] Brand tokens loaded as CSS custom properties; Work Sans self-hosted.
- [ ] PT-BR copy reviewer engaged (freelance native speaker, hourly).
- [ ] **Send the 10-question email to the prospect** (showcase date, scenarios, figures, venue network, devices, branding, POS targets, bilingual preference, repo visibility).
- [ ] Generate the seeded JSON datasets (16 stores, 80–120 SKUs, 30-day COO curve, 8-week learning curve). Use a fixed RNG seed; commit the seed.
- [ ] Confirm a **real test phone** exists in the office and is paired to a hotspot we control.

**Sprint 0 demo:** `npm start` opens the four routes; each shows a placeholder; presenter button "ping" produces a toast in operator view via WS.

### Sprint 1 — Operator + Scenario A engine (Week 1)

Goal: the audience-facing dashboard tells a credible story under Scenario A, presenter can drive Step 1.

- [ ] **Operator dashboard** table: SKU rows from JSON; columns product, store, units, hours-to-expiry, sell-through, urgency.
- [ ] Two stores visible by default (so 4–6% variance is implicit).
- [ ] Urgency-tier visual styling (SAFE / AMBER / CRITICAL) using brand tokens.
- [ ] Green→amber row transition, **0.8s, easing-in-out, non-jarring**, triggered by WS `STEP_1` event.
- [ ] Decision engine module `engine.ts`: pure function `evaluate(sku, scenario, weather?) → recommendation`. Scenario A logic complete with margin-floor clamp.
- [ ] Unit tests on engine: edge cases for margin floor, zero stock, expiry < 1h.
- [ ] Presenter panel skeleton with 6 numbered buttons and a Reset button. Step 1 wired.
- [ ] WS reconnect with exponential backoff; state replay on reconnect verified by toggling Wi-Fi.

**Sprint 1 demo (Friday):** presenter clicks Step 1; Morango · Loja 7 row transitions on the operator screen within 200ms; all other rows remain stable; full reset works.

### Sprint 2 — Mobile-as-web view + variable analysis + sync (Week 2)

Web-only scope: the mobile interface is a browser tab styled as a phone. The brief's #1 risk (venue Wi-Fi) does not apply.

- [ ] **Variable analysis panel** (Step 2): side panel renders 5 variables sequentially with a 200–300ms stagger, total 2–3s. Animation uses Framer Motion variants, not setTimeout chains.
- [ ] **Mobile-as-web view** (`/mobile`): browser tab containing a phone-shaped frame (~390px inner width, rounded corners, status bar, subtle device chrome). PT-BR strings: product name (largest), store/section, recommended discount %, urgency countdown ticking in real time, 56-px confirm button.
- [ ] WS event flow over `localhost`:
      `presenter STEP_3` → server broadcasts `MOBILE_ALERT(sku)` → mobile tab renders alert
      `mobile CONFIRM_ACTION` → server broadcasts `ACTION_LOGGED(sku, ts)` → operator row flips to "Ação tomada — monitorando".
- [ ] Action log persisted in server memory; survives client reconnects within the same session.
- [ ] Sub-50ms tab-to-tab latency expected on `localhost`; anything higher is a code smell.
- [ ] Connection-health indicator visible only on operator view (small dot, never to audience).

**Sprint 2 demo (Friday):** Steps 1–4 run end-to-end across four browser tabs on a single laptop; presenter triggers each step; operator and mobile-frame tab stay in lockstep; action log shows the confirmation row.

### Sprint 3 — COO + Scenarios B & C + Calculator (Week 3)

- [ ] **COO dashboard** (`/coo`) — executive layout, max 5 data points above the fold:
      shrinkage rate today vs 30-day baseline (large), savings this week R$, 30-day trend line, store-comparison bar/dot showing 4–6% gap, weekly actions count.
- [ ] Pre-loaded with `coo_30d.json`; never displays zeros.
- [ ] **Scenario B engine**: velocity model + day-of-week index + EOD projection; pre-emptive AMBER firing earlier than A on the same SKU.
- [ ] **Scenario C engine**: weather coefficient applied to velocity; 8-week learning curve rendered on COO.
- [ ] **Scenario switcher** on the presenter panel: flips a single Zustand key; **no fetch, no spinner, no reload**. Audit: capture network tab during a switch; must show zero requests.
- [ ] **Scenario Calculator** closing screen: pre-loaded with `client_figures.json`; three columns A / B / C with shrinkage, savings, payback, ROI; values update instantly on tier switch.
- [ ] PT-BR review pass on every team and COO string; freeze copy at sprint end.

**Sprint 3 demo (Friday):** full 6-step flow runs under all three scenarios with live tier switches at any step.

### Sprint 4 — Hardening, fallbacks, deliverables (Week 4)

- [ ] **Offline gate:** run the full 6-step flow on a clean laptop with Wi-Fi off and Bluetooth off, recorded.
- [ ] **Preflight script** (`npm run preflight`) fails the build if any HTTP fetch references a non-localhost host. Wired into CI.
- [ ] **White-label audit script** greps the entire repo (including JSON, fonts, build output, README) for forbidden strings (agency name variants, internal author names, `localhost:5173` dev artifacts, etc.). CI gate.
- [ ] Reset semantics verified: pressing Reset at any step returns all four views to Step 1 within 1 second.
- [ ] Performance pass: cold load <2s on a low-spec laptop; row-stagger jank-free at 60fps.
- [ ] **MP4 fallback recordings** captured: Scenario A end-to-end (mandatory), Scenario B end-to-end (preferred). 1080p, ≤10min total. PT-BR UI throughout. Narration script reviewed by PT-BR speaker.
- [ ] Architecture writeup finalised (already drafted; sign-off required).
- [ ] Phased delivery timeline finalised.
- [ ] README polished: one-command startup, network setup, troubleshooting.
- [ ] **Internal dry run** (Wednesday): full 6-step flow + scenario switches + reset + fallback playback on the actual presentation laptop.
- [ ] **Client dry run T-48h** (Thursday or per client schedule): tech lead present, mobile device confirmed on venue network if applicable, fallback recordings verified.
- [ ] **Demo environment locked.** Zero changes after dry-run sign-off.

**Sprint 4 demo:** the showcase itself.

---

## 4 · Module-level acceptance criteria

Every PR must satisfy the per-module DoD below before merging.

### Operator dashboard
- ≥80 rows visible without scroll on 1440-wide laptop
- 0.8s smooth row transition, no layout shift
- Two distinct stores visible with their own urgency distributions
- All product names from the mandatory list (Morango, Batata, Tomate, Pimentão, Maçã, Mamão Formosa, Repolho) appear

### Mobile-as-web view
- Phone frame ~390px inner width, visible device chrome (rounded corners, status bar)
- Renders identically when the browser viewport is wider — frame stays centred
- Confirm button ≥56px tall, contrasts brand tokens
- Urgency countdown ticks every second without drift
- All copy 100% PT-BR (no English fragments, including unit labels)

### COO dashboard
- Above-the-fold ≤5 metrics
- 30-day trend declines visibly; never zero
- Store comparison renders 4–6% gap with at least 4 stores represented
- Layout reads as "executive," not "operator" — tested by showing it to a non-team person

### Presenter panel
- 6 step buttons clearly labelled
- Scenario switcher visibly toggles A/B/C
- Reset returns all views to Step 1 in under 1s
- Connection-health indicator visible to presenter only
- Floating panel does not intrude on audience view if mirrored

### Decision engine
- Pure functions; no side effects
- Each tier has at least 5 unit tests covering boundary conditions
- Scenario switch never causes recomputation visible as a flicker

### WebSocket layer
- Reconnect succeeds within 3s of network restoration
- State replay produces an identical view to a peer that never disconnected
- No external host appears in any WS or HTTP request during the full demo

### White-label
- Repo grep produces zero hits for forbidden string list
- `package.json`, browser title, favicon, footer text, console logs all neutral
- README distributable to client without redaction

---

## 5 · Daily / weekly cadence

- **Daily standup**, 15 min, async-first via Slack thread, sync if blocked.
- **Tuesday**: tech-lead architecture review on the sprint's open PRs.
- **Friday**: sprint demo on the actual presentation laptop. PT-BR speaker present from Sprint 2 onwards.
- **End of every sprint**: white-label audit script run; output committed to `/docs/audit-log.md`.
- **Weekly**: client status note (3 bullets: shipped, next, blocked). Plain language. No agency branding.

---

## 6 · Test & QA strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Engine unit tests | Vitest | 100% of branches per scenario |
| Component tests | Vitest + RTL | All four views render under each scenario tier |
| WS integration | Node + a headless client | Reconnect, replay, ordered events |
| End-to-end smoke | Playwright | The full 6-step flow per scenario |
| Real-device test | Manual checklist on a real phone | Daily from Sprint 2 onwards |
| Offline test | Manual on a Wi-Fi-off laptop | Sprint 3 Friday + Sprint 4 daily |
| White-label audit | grep script | Every PR, gates merge |
| Performance | Lighthouse + CDP profile | Cold <2s, animations 60fps |

---

## 7 · Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|:-:|:-:|---|---|
| R1 | ~~Mobile↔dashboard sync flakes on venue Wi-Fi~~ — **eliminated by web-only scope** | — | — | n/a | — |
| R2 | White-label slip in repo / build | M | H (termination) | grep script in CI from S0; final manual audit S4 | Tech lead |
| R3 | Scenario switch flashes / spinners | L | M (rubric -50%) | Single Zustand key; preload all data | FE lead |
| R4 | PT-BR copy errors visible to native client | M | M | Native reviewer from S0; freeze at S3 | Designer |
| R5 | Client figures arrive late | M | L | Ship credible defaults; JSON drop-in | PM |
| R6 | Animation jank on presenter laptop | L | M | Profile early; reduced-motion fallback toggle | FE lead |
| R7 | 30-day COO data looks fake | L | M | Seeded smoothed curve with realistic noise | Data engineer |
| R8 | Showcase laptop is not the laptop we built on | M | M | Explicit setup script; dry run on actual device | Tech lead |

R1 and R2 are the only red-flag risks. Both are bounded; both have hard owners.

---

## 8 · Open dependencies on the prospect

These items block specific tasks. Track in the client status note until cleared.

1. **Confirmed showcase date** — anchors the timeline.
2. **Required scenario tier(s)** for the live presentation.
3. **Operational figures** for the calculator (current shrinkage %, FLV revenue, store count if not 16).
4. **Showcase venue network** — closed LAN, corporate Wi-Fi, hotspot allowed?
5. ~~Mobile device~~ — n/a (web-only).
6. **PT-BR vs bilingual** preference on operator dashboard.
7. **Production POS target(s)** for the architecture writeup integration section.
8. **Repo visibility** — private with collaborator access, or public?
9. **Branding assets** for the white-label container, if any.
10. **Showcase laptop** — ours or theirs?

---

## 9 · Showcase day plan

- T-48h: client dry run; tech lead present; **environment locked after sign-off**.
- T-24h: full 6-step flow + Scenario A→B→C switch + Reset, recorded as final fallback. Hashed, archived.
- T-2h: laptop on hotspot, phone paired, four browser tabs pre-opened, presenter panel on second screen, fallback MP4 ready in a media player on hotkey. Wi-Fi off.
- During: tech lead operates the demo silently; speaks only if asked a direct technical question. Fallback MP4 plays on first-frame failure of any step.
- After: archive the laptop image as-is; do not modify until the engagement closes.

---

## 10 · Sign-off

This plan is signed off by Tech Lead and PM at end of Sprint 0. Material changes (scope, stack, timeline) require both signatories. Cosmetic changes do not.

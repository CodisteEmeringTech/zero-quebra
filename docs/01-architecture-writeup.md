# symb.[zero quebra] — Technical Architecture

**Showcase Demo · Web Application · Offline LAN Deployment**
Document version: 1.0 · Repository: `github.com/<org>/zero-quebra-demo` *(private, access on request)*

> Render at A4, Work Sans 10/14, margins 18mm. This document is sized to print on two pages.

---

## 1 · System Overview

The demo is a single-process Node.js application that serves a React SPA over `http://localhost` and brokers real-time events between four browser views over a LAN-local WebSocket. All five interfaces — Operator Monitoring, Mobile Team, COO Executive, Presenter Control, and the Scenario Calculator — share one in-memory state machine. Demo data (16 stores · 200 FLV SKUs · 30 days of COO history · 8-week learning trajectory) ships as static JSON loaded once at boot. There is no database, no external API, and no internet dependency. One command (`npm start`) launches the entire stack.

```
   Presenter ──┐                                                  ┌── Operator
               │                                                  │
               ▼   WebSocket  (ws://<lan-ip>:4321)                 ▼
       ┌───────────────────────────────────────────────────────────────┐
       │  Node 20 + Express + ws  │  in-memory event bus + state store │
       │  serves built React SPA  │  loads /data/*.json at startup     │
       └───────────────────────────────────────────────────────────────┘
               ▲                                                  ▲
               │                                                  │
   COO ────────┘                                                  └── Mobile (phone/tablet)
```

## 2 · Frontend

**Choice:** React 18 + TypeScript on Vite, with Zustand for global state, Framer Motion for the staged transitions called out in the brief, Recharts for the COO trend and store-comparison views, and `react-i18next` to drive the PT-BR-first copy on team and executive screens.

**Rationale:** The brief permits "React or vanilla JS." Five interfaces share state and must remain in lock-step during live scenario switches; a typed component model with a single global store eliminates an entire class of desync bugs that would otherwise surface in front of the client. Vite gives a sub-second dev loop without committing to a framework runtime that would inflate bundle size. The full bundle target is ≤300 KB gzip — small enough to feel native on a presenter laptop, large enough for the polish the rubric rewards. Brand tokens (`#1B1D1E`, `#CAD3AC`, `#F2F2F2`) and Work Sans are encoded as CSS custom properties at the root, not hard-coded, so a future client-facing white-label remains a one-file change.

## 3 · Mobile Real-Time Sync

**Pattern:** A single Node process exposes both the static SPA and a WebSocket endpoint on the same port. Every browser tab — desktop or mobile — opens one WS connection on load and subscribes to the demo event stream. The presenter panel is the only authoritative emitter; the operator and COO views are read models; the mobile view emits exactly one event (`ACTION_CONFIRMED`) when the supervisor taps the 56-px confirmation button.

**Topology:** The presenter laptop runs the server and broadcasts its own Wi-Fi hotspot. The mobile device joins that hotspot, scans a printed QR pointing at `http://<laptop-lan-ip>:4321/mobile`, and is paired in under five seconds. This isolates the demo from the venue network entirely.

**Resilience:** Each client reconnects with exponential backoff and re-hydrates from the server's last-known state on reconnect, so a transient drop never produces a blank screen. The presenter panel surfaces a small connection-health indicator visible only to the operator, never to the audience.

**Why local WebSocket and not a hosted service:** The brief explicitly forbids Firebase, Pusher, or any external real-time provider. A self-hosted `ws` server is roughly 40 lines of code, has zero external failure surface, and runs on the same laptop as the SPA — the simplest possible thing that satisfies the requirement.

## 4 · Decision Engine — Logic per Scenario

The engine is a deterministic, pure-TypeScript module. It is not a trained model; the brief explicitly permits this for the showcase.

**Scenario A — Conservative.** Five inputs per SKU: stock level, hours to expiry, current sell-through, day's velocity, margin floor. The engine projects end-of-day units linearly, computes units-at-risk, classifies urgency (SAFE / AMBER / CRITICAL), and recommends an action with a discount band — clamped so price never falls below the cost-price margin floor. Reactive: the engine speaks when stock visibly piles up.

**Scenario B — Base.** Adds a sales-velocity model and a day-of-week demand index. The end-of-day projection now multiplies a calibrated baseline by the day's index, allowing the engine to fire AMBER pre-emptively in mid-morning, before the floor team would notice the problem unaided. The visible difference for the audience: the same Morango row turns amber two hours earlier than under Scenario A.

**Scenario C — Optimistic.** Adds a weather signal and a learning loop. A hot/cool toggle on the presenter panel applies a sensitivity coefficient to per-SKU velocity. A separate eight-week accuracy curve renders on the COO view, climbing from 71% to 94% as cross-store outcomes feed back into per-store calibration. The learning loop is rendered, not trained — the brief explicitly permits this; production work is described in §6.

**Switching:** All three scenarios share one in-memory dataset. Switching tiers flips a single state key and re-renders; no fetch, no spinner, no reload. This is a hard line in the brief's acceptance criteria.

## 5 · Offline Approach

The application is offline-by-construction. The Vite build emits a single static bundle, served by Express from `/dist`. All demo data is bundled in `/data/*.json` and read into memory at process start. No CDN, no external font (Work Sans is self-hosted under `/public/fonts`), no analytics, no telemetry, no error-reporting service. The presenter laptop can be in airplane mode for the entire showcase. A pre-flight script (`npm run preflight`) walks every asset reference and fails the build if any URL leaves `localhost`, which is run as the final gate before sign-off.

## 6 · Production Integration Pathway

In a production deployment, the demo's static JSON is replaced by a thin ingestion layer that listens to the retailer's POS and inventory feeds.

**TOTVS Protheus / Linx Microvix** (the two dominant systems in Brazilian grocery): both expose REST endpoints and message-queue feeds for sales transactions, inventory snapshots, and price changes. A FastAPI ingestion worker subscribes to the sales stream (per-store, per-SKU, near-real-time) and to the daily inventory and expiry feeds, normalises records into the same shape the demo's JSON uses today, and writes them to a TimescaleDB (or Postgres + partitions) sales-velocity store. The decision engine, unchanged, runs as a stateless service against that store. Markdown recommendations push back to the POS via the same vendor's price-update API on a per-store basis, with an approval gate routed through the existing mobile interface. A model-training pipeline (Scenario C in production) consumes the action-log table and refits velocity and weather coefficients nightly. The handover from demo to pilot is therefore an integration project, not a rewrite — the demo's component boundaries are the production component boundaries.

---

*Functional demo, phased delivery timeline, and narrated MP4 fallback recordings (1080p, ≤10 min, all six steps) accompany this document. Showcase configuration and dry-run protocol are detailed in the delivery-timeline document.*

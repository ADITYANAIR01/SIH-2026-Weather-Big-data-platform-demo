# JanMausam — Frontend UX Architecture & Data-Swap Contract

**ArchitectUX · Foundation Pass · 2026-08-30**
**Scope:** Public desk (`/`), Admin Desk Console (`/admin`), shared primitives, and the **hot-swappable mock⇄live data boundary**.
**Constraint honored:** Backend is a fixed input. The frontend (and this doc) adapt to it; nothing here proposes a backend change.
**Status:** Design specification only — nothing in this file is implemented. Small-batch ready for a later implementation pass.

---

## 0. Governing Principles

1. **The hot-swap contract is sacred.** Swapping the `NEXT_PUBLIC_DATA_MODE` env knob must produce *byte-identical* UI behavior between mock and live. Every recommendation below guards that invariant.
2. **`src/lib/data.ts` is the ONLY wall between UI and backend.** No component may `fetch('/api/backend/…')` directly, and no component may reach into raw backend JSON shapes. The UI may only ever see `Report`, `Region`, `Stats`, `ClusterCollection`, `ReportResult`, `AdminActionPayload`.
3. **The map is the centerpiece interaction.** Pins, filters, cluster expansion, and district tracking drive the public story; the same canvas drives admin triage.
4. **Two cadences of truth:** the public desk refreshes "editorially" (15s), the desk console refreshes "operationally" (5s). Latency is simulated in mock so live feels identical.
5. **Dependency-free state.** No global store is introduced. State is component-lifted + a thin context/hook split by data life.

---

## 1. Information Architecture

### 1.1 Sitemap

```
/                          PUBLIC DESK (HomeView)           [RSC shell → client]
├── #top      masthead             (sticky nav + live flash ticker + CTA)
├── #lede     hero lede            (H1 + stat strip)
├── #map      The Live Map         (MapBand: MapCanvas + filters + legend + story card)
├── #analysis TrendCharts          (velocity / top states / event mix)
├── #live     StoryFeed            (verified wires, each with "Why verified?")
├── [modal]   ReportModal          (citizen report-a-wire)
└── footer

/admin                     ADMIN DESK CONSOLE (AdminAuthGate → DeskConsole)
├── gate        AdminAuthGate      (session-token wall)
└── console     DeskConsole        (stats strip + queue + admin map)
    ├── StatsStrip
    ├── QueueWire[]                (each expandable via WhyVerified)
    └── PromoteModal
```

### 1.2 Shared primitives (used by BOTH desks)

| Primitive | File | Consumed by |
|---|---|---|
| `MapCanvas` / `IndiaMap` | `src/components/map/*` | public + admin (variant prop) |
| `StatusPill` | `src/components/ui.tsx` | admin queue, admin legend |
| `WhyVerified` | `src/components/home/WhyVerified.tsx` | public story + admin queue (reused) |
| **data layer** | `src/lib/data.ts`, `types.ts`, `mockData.ts` | both |
| **event meta** | `src/lib/eventMeta.ts` | both (labels, colors, hindi) |
| **format** | `src/lib/format.ts` | both (IST, relative time) |

### 1.3 Public-desk content hierarchy

- **H1** (Lede): product promise + India-center framing.
- **H2** sections: `The Live Map · लाइव मानचित्र`, `Analysis · विश्लेषण`, `Live dispatch from the states`.
- **H3** within map story card and each wire card.
- The **masthead** carries: brand (EN+Devanagari), date, LIVE/DEMO feed chip, anchor nav (`#map #analysis #live`), Desk link, हिन्दी locale hint.
- **Primary CTA** (floating "Report a weather event") is present above-the-fold, always reachable.

### 1.4 Public-desk user flow (landing → map → pin → wire → verify → report)

```
Landing (mock or live)
  → masthead LIVE/DEMO chip tells the judge which mode
  → Lede stat strip (verified counts, states, today total, queue depth)
  → anchor/scroll to #map
      → India fills viewport (fitBounds to INDIA_BBOX)
      → pins appear (clustered on the public canvas)
      → hover/pointer-cursor affordance
      → CLICK a cluster → flyTo + expand to pins
      → CLICK a pin → SelectedStory card slides in (right/bottom)
          → reads editorial headline, event chip (EN + Hindi), text, meta
          → "How was this verified?" <details> → WhyVerified desk filing
          → dismiss (✕) or click background
      → filter chips (All events / per event type) hide non-matching pins live
      → state/district tracking zooms + highlights the chosen district
  → scroll to #analysis (charts) then #live (wire cards + Why verified?)
  → ANYTIME: floating CTA → ReportModal → submit → confirmation panel
```

### 1.5 Admin-desk user flow (gate → radar → queue → verdict → promotion → map)

```
/admin
  → AdminAuthGate: enter desk code (session only)
  → DeskConsole
      → StatsStrip "radar": Queue depth · today · verified · awaiting triage · states
      → Queue column (left): status filter chips (All + 6 statuses) → wire cards
            select a wire → scrolls into view + highlights pin on admin map
            <details> "Desk filing & reasoning" → WhyVerified
            verdicts: Approve / Reject / Promote story
                  Approve/Reject → optimistic update → PATCH backend → refresh
                  Promote → PromoteModal writes headline (+optional note) → PATCH(approve/promote)
      → Map column (right, sticky): full-status admin map, status-colored pins,
            filter syncs with status chips, "reset view" remounts the map
      → RESULT: after a verdict+refresh, the new verified wire appears in public
            map (already picked up on next public 15s poll)
  → Lock → clears session token, back to gate
```

---

## 2. Interaction Model — India Map

### 2.1 Default viewport & bounds (`IndiaMap.tsx`)

- **Center:** `[82.8, 22.8]`, **zoom:** `4.2` (constants live in `lib/indiaBounds.ts`).
- **maxBounds:** locked to `[INDIA_BBOX[0]-1.2, INDIA_BBOX[1]-1.0, INDIA_BBOX[2]+1.2, INDIA_BBOX[3]+1.0]`. User can never pan/zoom out of India.
- **On `load`:** `fitBounds` to `[b0-0.4,b1-0.3, b2+0.4,b3+0.3]` with padding — whole country, zero duration.
- **Controls:** zoom in/out bottom-right (no compass). No rotation (map is locked).

### 2.2 Pin / click model

- **Clustering:** MapLibre native clustering on the `events` source (`cluster: true`, `clusterMaxZoom: 6`, `clusterRadius: 46`, `promoteId: "id"`).
- **Cluster click:** `flyTo({ center, zoom: max(z+1.8, 6.4) })` — zooms in to reveal children.
- **Pin click:** `onSelectFeature(id, coords)` → parent sets `selectedId` → `SelectedStory` card renders; `events-selected` layer highlights the pin.
- **Background click:** `onBgClick` clears selection (dismiss story card).
- **Cursor affordance:** `pointer` on `cluster-circle` and `events-point` on mouseenter; default on leave.

### 2.3 Hover previews

- **Current state:** cursor-pointer only; no hover popup. Story detail is click-to-open.
- **Recommendation (small-batch, optional):** add a lightweight hover tooltip on `events-point` (pin meta) shown on `mouseenter`/`touchstart`, dismissed on click/`mouseleave` and on `prefers-reduced-motion`. Keep it a *preview*, never the primary read.

### 2.4 Filtering

- **Event-type (public)** — `MapBand` chips: `activeEvents` array; applied as a layer filter (`["any", ["==",[get event_type],e]...]` for `events-point` + `events-glow`). "All events" clears.
- **State/district tracking (public)** — `<select>` → `RegionSelection`; applies district fill/line highlight layer + `fitToDistrict` zoom/pad. Driven by `fetchRegions()`.
- **Status (admin)** — `DeskConsole` chips → `activeStatuses` layer filter on the same MapCanvas (`variant="admin"`).

### 2.5 Legend, empty, loading, error/retry

- **Legend (public):** bottom-left "N verified" + "Click a pin for the full story" (hidden < `sm`).
- **Admin legend:** bottom of map column: pending / AI flagged / published status swatches.
- **Empty:** no pins → public map shows India + "0 verified"; StoryFeed falls back to an editorial empty message; admin queue shows `EmptyState("Queue is clear", …)`.
- **Loading (initial):** full-screen `Spinner("Opening the desk…")` while first `fetchClusters/stats/regions` resolve. Admin: `SkeletonRows`. Map canvas itself: spinning top loader via `MapCanvas` dynamic `loading`.
- **Error/retry — GAP (see §5.5):** today `Promise.allSettled` swallows failures; there is **no error banner or retry affordance**. Must add a thin `loadState` ("loading" | "ready" | "error") surfaced as an inline `ErrorState` (message + "Retry" button) on both desks.

### 2.6 Latency simulation for parity

Mock latencies today: clusters 150ms, regions 80ms, stats 120ms, queue 200ms, submit 350ms, deskAction 250ms; **no jitter**, and live has real network latency variety.
**Rule for parity:** mock must emulate *measurable* live behavior without being jarring. Recommended: change fixed delays to `delay(latencyFor("clusters"))` where `latencyFor` returns a base ± jitter that matches the live proxy round-trip (~120–350ms). Because both modes route through the identical async API surface, *interactions* are identical; only the wall-clock differs. Keep mock on the **same rough scale** so the judge can't tell mode apart instantly.

---

## 3. State Management & Data Lifecycle

### 3.1 No global store — component-lift + one context

The app has only two pages and no cross-page shared mutable state need. Introduce **no** third-party store. Structure:

- **`HomeView` owns** `clusters`, `stats`, `regions`, `loading`, `reportOpen`; passes data down as props (already the pattern). Data-rest fetch lives in `HomeView`.
- **`DeskConsole` owns** `queue`, `verified`, `stats`, `loading`, `busyId`, `selectedId`, `statusFilter`, `mapEpoch`, `promoteFor`; passes to `QueueWire`/`StatsStrip`.
- **Only genuinely shared concern** worth a context: the read-only "mode + load" metadata (`dataMode`, `modeLabel`, a shared `useLoadState`). A minimal `DataContext` (single `src/lib/data-context.tsx`) exposing `{ mode, modeLabel }` lets both desks render the LIVE/DEMO chip identically. Keep it tiny and adapter-free.

### 3.2 Proposed hook API (small-batch, dependency-free)

Add a thin hook layer over `data.ts` (never over `fetch`):

```
src/lib/useDeskData.ts
  useDeskData({ mode }) -> { queue, verified, stats,
                             loadState:'loading'|'ready'|'error',
                             lastUpdated, refresh, err }
  usePublicData({ sinceMinutes, pollMs }) -> { clusters, regions, stats,
                                               loadState, lastUpdated, refresh }

src/lib/usePolling.ts    // shared interval hook with cleanup + reduce-motion guard
```

Both hooks:
- call the `data.ts` fns inside `Promise.allSettled`,
- swallow per-fn failure but aggregate `loadState`,
- expose `refresh()` for retry/manual,
- auto-poll only when `mode === 'live'` (mock data never changes, so no polling — this *is* the parity guarantee).

### 3.3 Polling / revalidate strategy (live)

| Surface | fn | Interval | Notes |
|---|---|---|---|
| Public clusters | `fetchClusters(sinceMinutes=1440)` | **15s** (current — keep) | editorially paced |
| Public regions | `fetchRegions()` | 15s with clusters | slow-changing |
| Public stats | `fetchStats()` | 15s with clusters | charts update together |
| Admin queue | `fetchQueue()` | **5s** (current — keep) | operational cadence |
| Admin verified | `fetchClusters()` | 5s with queue | keeps admin map consistent with public |
| Admin stats | `fetchStats()` | 5s with queue | |

Rule: **mock never polls** (static data), so a judge comparing modes sees identical data, only interview cadence differs. Optionally, to make the demo feel alive, mock may sample small drift on each manual refresh — but keep it deterministic to avoid UI/state divergence.

### 3.4 Mock ratios/values that must stay believable

Keep the mock welded to the same reality as live so a swap is invisible:

- `today_total` ≥ `today_verified` + `queue_depth` (ingest volume consistent with a busy monsoon desk). Current: 164 total / 130 queue / 38 verified — **believable; preserve the arithmetic invariant** `today_total ≈ today_verified + (processed elsewhere) + queue_depth` so the Lede's "reports received today" vs "awaiting triage" don't contradict.
- `status_breakdown` sums should reconcile with `queue_depth` + published count (not required literally, but avoid e.g. more `pending` than `queue_depth`).
- `velocity` = 6 hourly points, monotone-but-noisy, sum = "reports last N hrs" shown in TrendCharts (keep in sync).
- Cluster pins all inside `INDIA_BBOX`; coordinates correspond to real state/district in `Region[].districts`.
- Trust scores bounded [0,1]; classifier conf bounded [0,1]; `corrob` integer ≥ 0.
- **Invariant:** every status string in mock ∈ `ReportStatus` and every event ∈ `EventType`, or the chips/legends break.

---

## 4. Responsive & Accessibility Strategy

### 4.1 Breakpoints (Tailwind, mobile-first)

| Token | px | Behavior |
|---|---|---|
| base | 0 | full-width, 16px gutters |
| `sm` | 640 | map story card right-anchored, legend shows |
| `md` | 768 | TrendCharts 3-col, admin stats 5-col, StoryFeed 2-col |
| `lg` | 1024 | admin split: `grid-cols-[1fr_420px]` (queue + sticky map) |
| `xl`/`2xl` | 1280+ | container caps (`max-w-6xl` public, `1100px` admin) |

### 4.2 What collapses below 768px

- **Map height:** public `h-[58vh] min-h-[430px]` — keep, but on `<sm` drop to `h-[45vh] min-h-[320px]` so filters/legend don't crowd; admin map `h-[420px]` → `h-[300px]`.
- **Filter chips:** wrap; "All events" + chips become scrollable row (already flex-wrap). Keep the district tracker as a sheet or single select at `<sm`.
- **Legend:** hidden `<sm` (current) — on mobile fold the "N verified" into the story card header.
- **TrendCharts:** 1-col `<md` (current grid) — fine.
- **Admin queue rows:** keep code/toolbar wrapping; promote/approve buttons wrap to two rows on narrow widths (already `flex-wrap`).
- **Admin map column:** below `lg` it stacks **below** the queue (natural DOM order) — document this so the "map reflects verdict" beat is seen at `lg+`.

### 4.3 Keyboard / focus / ARIA (gaps today)

- **Map:** MapLibre canvas is not a tab stop by default. Add `tabIndex=0` + `role="region"`+ `aria-label` on the map container, and an `aria-live` offscreen "selected story" region so keyboard/spin-screen users hear pick changes. Map click-to-pin must have a non-map path (see #analysis/#live cards which are real buttons — good redundancy).
- **Filter chips / status chips / wire cards:** are `<button>`/clickable `<article>` — the `<article onClick>` in `QueueWire` is **not keyboard-addressable** (no role/tabIndex/onKeyDown). Fix: make the whole wire a `<article role="application">` with a real "Select" `<button>` or add `tabIndex=0`, `role="button"`, `Enter/Space` handler, `aria-pressed`.
- **Modals** (`ReportModal`, `PromoteModal`): add focus trap + initial focus to the first input, `aria-labelledby` (currently `aria-label` present — good), and restore focus on close. Add `onKeyDown` Escape handling.
- **`<details>` "Why verified?":** natively keyboard/screen-reader accessible — keep, don't replace with JS tabs.
- **Status/event chips:** add `aria-pressed` for toggle state.
- **Contrast:** paper/ink palette passes WCAG AA for body text; chips using `text-bay/30`-style low-opacity borders are decorative only — ensure *semantic* labels never rely solely on color (each status also has icon + text). Add `focus-visible` rings (partially present via `.btn`, extend to chips).

### 4.4 Reduced motion

- Add `prefers-reduced-motion: reduce` override in `globals.css` to disable `scroll-smooth`, ticker, `animate-card-in`, pulse dots, and MapLibre flyTo (substitute `jumpTo` when reduced motion active).
- Guard polling with the same hook so `setInterval` is paused under reduced motion (optional, but consistent).

### 4.5 Language / lang attribute + Hindi–English labels

- Current `<html lang="en">` is fine (primary), but Devanagari spans elsewhere need `lang="hi"` for correct rendering/font shaping: wrap `जनमौसम`, `लाइव मानचित्र`, `संपादन कक्ष`, event Hindi labels in `<span lang="hi">`.
- **Bilingual label strategy (consistent pattern to apply everywhere):**
  - Section: `The Live Map · लाइव मानचित्र` → `<span>The Live Map</span> · <span lang="hi">लाइव मानचित्र</span>`.
  - Desk Console: `Desk Console · संपादन कक्ष` (already good).
  - Event/status chips already pair EN label + Hindi title on `StatusPill` (`title={m.hindi}`) — extend `title` to event chips too.
- Add `dir="ltr"` explicitly on the `<html>`/root to avoid any Devanagari RTL misinterpretation; keep numeric/mono fields `dir="ltr"`.

---

## 5. THE HOT-SWAP CONTRACT (most important deliverable)

### 5.1 The single choke point

`src/lib/data.ts` is the ONLY module that branches on `NEXT_PUBLIC_DATA_MODE`. **Enforce**: no component imports `fetch` for backend paths; no component reads `process.env.NEXT_PUBLIC_DATA_MODE`; no component references backend JSON shape keys. Add a lint/test rule (void lint or a tiny unit test) asserting only `data.ts` contains `fetch(`/`process.env.NEXT_PUBLIC_DATA_MODE`.

### 5.2 Path mapping audit (live)

Proxy strips `/api/backend/` and prepends `${BACKEND_BASE_URL}/api/v1/`. Verify the frontend→backend mapping is consistent with the coded proxy:

| Frontend fn | Proxy path | Backend target |
|---|---|---|
| `fetchClusters` | `/api/backend/public/clusters?since_minutes=…` | `/api/v1/public/clusters?since_minutes=…` |
| `fetchRegions` | `/api/backend/regions` | `/api/v1/regions` |
| `fetchStats` | `/api/backend/admin/stats` | `/api/v1/admin/stats` |
| `fetchQueue` | `/api/backend/admin/queue` | `/api/v1/admin/queue` |
| `deskAction` | `/api/backend/admin/queue/{id}` | `/api/v1/admin/queue/{id}` |
| `submitReport` | `/api/backend/report` | `/api/v1/report` |

**Note:** the implementation plan names `/api/v1/report` — the frontend currently calls `/api/backend/report`. This is consistent **only** if the backend route is exactly `report` (not `admin/report`); flag for a curl-verification against the live stack during integration, but do not change backend. If it misaligns, the minimum frontend-only fix is adjusting the path literal in `data.ts` / proxy — still UI-invisible.

### 5.3 Type-fidelity audit — the gaps you must know

#### (a) `ClusterFeature.properties` and queue envelope over-promise `Report`
`types.ts` declares `ClusterFeature.properties: Report`, and `fetchQueue`'s inline inline queue type declares `properties: Report`. But **the real geometry envelope does not carry `lat`/`lon` inside `properties`** — they exist only in `geometry.coordinates` (this is the invariant stated in the brief, and `fetchQueue` correctly unwraps them: `...f.properties, lat: coords[1], lon: coords[0]`).

**Impact:** The public map reads `f.properties.id`, `event_type`, `created_at`, `state`, `district`, `text`, `editorial_headline`, `source`, `corroboration_count` — it **never** needs `lat`/`lon` from properties. So today the *over-broad* type is harmless at runtime, but it makes the compiler promise fields that the live envelope won't supply, inviting latent bugs if a future component reads `properties.lat`.

**Minimal fix (contract-strengthening, frontend-only):**
```ts
// types.ts — make the envelope faithful instead of over-promising
export interface ClusterProps extends Omit<Report, "lat" | "lon"> {}
export interface ClusterFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: ClusterProps;          // NO lat/lon in properties — sourced from geometry
  id?: string;                        // promoteId surface (optional in payload, needed by UI)
}
```
And in `fetchQueue`, change the inline queue item type to use `ClusterProps` (not `Report`) and derive lat/lon — already done, just re-type it. **The gesture that matters:** keep the derived `Report` at the call boundary so `fetchQueue(): Promise<Report[]>` is unchanged (UI sees full `Report`); only the internal envelope type becomes honest.

#### (b) `Report` field presence is an assumption, not a guarantee
`Report` has optional fields (`trust_score`, `state`, `district`, `media_url`, `editorial_headline`, `pipeline`) and required ones (`id, text, lat, lon, source, created_at, event_type, corroboration_count, status`). In live mode the backend controls which are present:

- `Lede` reads `stats.today_total`, `stats.queue_depth` — required by `DeskStats`. Confirm backend returns them.
- `WhyVerified` reads `report.pipeline?.event_conf`, `corroboration_count`, `trust_score`, `state`, `district`, `audit_reason`. If the live cluster properties omit `pipeline`, the component degrades gracefully only because of `?? 0` / `?.` / fallbacks — **verify with a real payload**, do not assume.
- `Masthead`/`MapBand` read `editorial_headline ?? text` and `properties.id` (required for pin selection + `promoteId`). If live cluster features lack `id`, pin selection breaks silently.

**Fix (frontend-only, defensive):** add a **schema-normalizer** inside `data.ts` (single place) that maps a raw live feature into the typed `Report`/`ClusterProps`, filling safe defaults (`text ?? "Untitled report"`, `id ?? geometry-derived uid`, `created_at ?? now`, `state/district ?? null`, `pipeline` synthesized if absent). This makes the UI independent of exact backend field presence **and** keeps mock⇄live byte-identical because both pass through the same normalizer. The normalizer is the strongest single defense against a payload drift on demo day.

#### (c) `DeskStats.velocity` shape
`{ hour: string; count: number }[]` — TrendCharts sums `count` over `velocity.length`. Confirm live returns chronologically-ordered hourly points (mock supplies 6). If live returns fewer/older points, TrendCharts still renders (uses `max(…,1)`) — safe, but a judge comparing modes sees different chart widths. Acceptable; note as a soft-consistency item.

#### (d) `ReportResult` from `submitReport`
`ReportModal` renders `result.id/status/trust_score/state/district/corroboration_count/is_duplicate/event_type`. The mock returns a full object. If the live `/api/v1/report` returns a different acknowledgement envelope, the confirmation panel will render `undefined`/`—`. **Do not change backend** — instead guard with defaults in the modal (`result?.event_type ?? "unclassified"` etc.) and rely on the normalizer to inject `id` / `status` if absent.

### 5.4 Admin-token flow

- The **client `AdminAuthGate` token is a UI-only, session-local gate** (`sessionStorage["janmausam-desk-token"]`). It is **not** sent to the backend.
- The **backend admin token** is `ADMIN_TOKEN` env, injected **server-side** in `app/api/backend/[...path]/route.ts` as `x-admin-token`. It never appears in client bundle.
- Therefore: gating and authorization are decoupled. The desk gate is decorative security; the proxy is the real gate. **Do not** try to push the client token through the proxy (it is not an auth path). If a real role check is ever needed, that is a backend concern (out of scope).
- **Timeout/error handling at proxy:** `proxy()` wraps backend fetch in try/catch → returns `502 { error: "backend unreachable…" }`. The UI `liveJson` throws on non-ok → currently swallowed by `Promise.allSettled`. 

### 5.5 Request / error / timeout handling (recommended, frontend-only)

Today there is **no timeout, no error UI, no retry**. To keep the demo resilient and honest:

1. Add `AbortController` timeouts inside `liveJson` (e.g. 10s) so a wedged backend doesn't pin charts forever.
2. Change `useDeskData`/`usePublicData` hooks to aggregate per-fn errors into an `err` and surface `loadState` (`loading|ready|error`).
3. Render `ErrorState` (message + "Retry" → `refresh()`) in place of charts/map/queue when `loadState === 'error'`; keep the last-known-good data visible beneath (stale-while-error) so a transient blip doesn't blank the page.
4. On mock, `liveJson` is never called, so timeouts/errors are structurally impossible there — which itself proves mode-safety: the error/retry path can only be exercised in live, and mock is a strict subset (no error states) because data is static.

### 5.6 Byte-identical guarantee checklist

- [] Both modes return the **same typed objects** through `data.ts` (normalizer guarantees field presence).
- [] UI has exactly **one** data surface (`fetchClusters/fetchRegions/fetchStats/fetchQueue/submitReport/deskAction`); no inline backend JSON access.
- [] Mock does **not** poll; live polls per cadences in §3.3 — interactions identical, cadence is the only tell.
- [] `dataMode`/`modeLabel` come from `data.ts`, not from component reads of env.
- [] Dock/build: `NEXT_PUBLIC_DATA_MODE` is a **build-time** var (inlined by Next). Live/mock is a deploy-time choice (Docker `ARG`/`ENV` in `frontend/Dockerfile`, compose passes `live`). Document that hot-swap = rebuild with the flag; there is no runtime switch, and **this is by design** (keeps the proxy/token server-side).

### 5.7 Contract violations found (concrete, minimal fixes)

| # | Violation / gap | Where | Minimal fix |
|---|---|---|---|
| V1 | `ClusterFeature.properties: Report` and queue envelope `properties: Report` over-promise `lat/lon` that the real envelope lacks. | `types.ts` L49–58; `data.ts` L64–69 | Introduce `ClusterProps = Omit<Report,"lat"|"lon">`; keep `fetchQueue(): Promise<Report[]>` output. |
| V2 | No field-presence guarantee; components assume `id`, `created_at`, `pipeline`, `editorial_headline` exist on live cluster/queue/result objects. | `MapBand`, `Masthead`, `WhyVerified`, `ReportModal` | Single `normalizeFeature()/normalizeReport()` inside `data.ts`; default-fill. |
| V3 | `queue`/`clusters`/`stats` fetch failures are silently swallowed (`Promise.allSettled`); no error/retry UI exists. | `HomeView` L25–35, `DeskConsole` L85–91, no ErrorState | Add `loadState` + `ErrorState` + Retry; AbortController timeout. |
| V4 | `QueueWire` `<article onClick>` not keyboard-addressable. | `QueueWire` L32–35 | role/tabIndex/Enter handler or real Select button. |
| V5 | Devanagari spans lack `lang="hi"`. | Masthead/Lede/map/admin headers | Wrap in `<span lang="hi">`. |
| V6 | `fitToDistrict` + district tracker depend on `india-districts.geojson` property keys (`state`/`district`) matching `Region[].districts` values; if mismatched, highlight/fly fails silently. | `IndiaMap` L179–207, `MapBand` district selects | Add a guard: if district feature not found, log + keep map as-is (no crash); document the naming dependency as a data-file contract. |
| V7 | `ReportModal` renders `result.trust_score/event_type/(…)/…` with hardcoded `—` fallbacks but `result` could be partially shaped if live envelope differs. | `ReportModal` L81–100 | Rely on normalizer + explicit `?.`/defaults (see V2). |
| V8 | `velocity` point-count assumption (TrendCharts sums over whatever length). | `TrendCharts` L52 | Accept any length; never divide by zero (already guarded). Soft consistency note. |

None of these require backend change; all are frontend `data.ts`/`types.ts`/component hardening that preserves the swap contract.

---

## 6. Acceptance / Verification Plan (3-min demo walkthrough)

Ordered so a judge watches the strongest beats first. Each line is an observable behavior.

### Public checkpoints
1. **Mode chip:** masthead shows **LIVE FEED** (green) or **DEMO** (dune) — tells the judge which path is live.
2. **Landing beat:** page loads with Spinner → fills with Lede stat strip (verified / states / today / queue).
3. **Map fills India:** on load the whole country is framed, locked bounds — panning stops at the border.
4. **Clusters visible:** pins appear clustered; hover shows pointer; hovering a chip pre-highlights.
5. **Cluster expand:** click a cluster → map flies in and splits into pins.
6. **Pin → story:** click a pin → story card slides in with event chip (EN + Hindi), headline, meta, and **"How was this verified?"** expanding to the desk filing (confidence, corroboration, trust formula, resolution).
7. **Filters:** toggle event-type chips → non-matching pins vanish live; "All events" restores.
8. **District tracking:** pick a state/district → map zooms and highlights that district.
9. **Analysis:** velocity, top states, event mix bars render from `stats`/clusters.
10. **Wires:** `#live` shows verified cards, each with "Why was this verified?".
11. **Report-a-wire:** floating CTA → modal → submit → "Received by the desk ✓" with ack id + inferred state/status.
12. **Length coherence:** "awaiting triage" ≤ stats and "states" count matches pins — believable numbers.

### Admin checkpoints
13. **Gate:** `/admin` asks for a code; wrong/empty shows error; valid enters.
14. **Radar strip:** queue / today / verified / awaiting triage / states all populate.
15. **Queue triage:** status chips filter; selecting a wire scrolls to it AND highlights its pin on the admin map.
16. **Desk filing:** expand "Desk filing & reasoning" on a wire.
17. **Verdict:** **Approve** → optimistic status flips to Verified, `refresh()` runs (5s poll), admin map pin recolors green.
18. **Promote:** on a wire → PromoteModal → headline → it publishes; wire gains "promoted" chip; `today_verified` ticks.
19. **Map reflects it:** within the next public 15s poll, the newly verified wire appears on the public map / `#live` — closing the loop (judge should watch this across tabs).
20. **Reject:** a wire → Rejected (grey/red pin, drops off admin map).
21. **Reset view + Lock:** desk map "reset view" refreshes; Lock returns to gate.
22. **Responsive:** at ~800px wide admin stacks map below queue; at ~375px public map shrinks, chips wrap, mobile-friendly.

### Hot-swap proof (mode-agnostic)
23. Rebuild once with `NEXT_PUBLIC_DATA_MODE=live` → repeat the SAME walkthrough; the only visible difference should be the LIVE chip and real-time cadence (not a layout/interaction change).
24. Error resilience (optional): stop the backend (live) → charts/map show a non-blank ErrorState + Retry; start it → Retry recovers. Mock never hits this path.

---

## 7. Implementation Order (small-batch friendly)

**Batch A — contract hardening (highest impact, no visual change):**
1. `types.ts`: add `ClusterProps` envelope; retype `fetchQueue`/`ClusterFeature` internals.
2. `data.ts`: add `normalizeFeature`/`normalizeReport`; apply to live cluster + queue + report-result paths; add AbortController timeout.
3. Add `DataContext` + `useDeskData`/`usePublicData`/`usePolling` hooks; refactor `HomeView`/`DeskConsole` onto them; introduce `loadState` + `ErrorState` + Retry.

**Batch B — accessibility & i18n:**
4. `QueueWire` keyboard/ARIA; modal focus-trap/Escape; chips `aria-pressed`.
5. `lang="hi"` on Devanagari spans; `dir="ltr"` on root.
6. `prefers-reduced-motion` overrides + map flyTo→jumpTo fallback.

**Batch C — responsive & interaction polish:**
7. `<sm` map height/filter folds; legend into story card on mobile; admin map stack note.
8. Optional hover preview tooltip on pins; empty-state copy for all three surfaces (public map / story feed / queue).

**Batch D — verification:**
9. Run full acceptance checklist in BOTH modes; run `npm run typecheck` after each batch.

---

*ArchitectUX · Foundation spec complete. Nothing here is implemented — this is the design contract a LuxuryDeveloper implementation pass builds against.*

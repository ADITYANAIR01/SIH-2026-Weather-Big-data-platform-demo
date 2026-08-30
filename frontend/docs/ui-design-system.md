# JanMausam UI Design System — Visual & Interaction Specification

**Product:** JanMausam — The People's Weather Desk (जनमौसम) · SIH-2026 demo
**Scope:** Visual system, tokens, component elevation, map chrome, data-viz, accessibility
**Constraint:** Presentation-only. All data flows continue through `frontend/src/lib/data.ts` (`dataMode: "mock" | "live"`) and the `Report`, `Region`, `Stats` types in `frontend/src/lib/types.ts`. No new data-fetching, no bypass of the adapter, no edits to components — this document is the prescription; a separate implementation pass applies it.
**Audience for the doc:** Frontend/design implementer applying changes in small batches.

---

## 1. Visual Design Principles & Mood

JanMausam is a hybrid of **Digital India Portal** (trust, official, accessible, Devanagari-accented) and **Monsoon Data Studio** (editorial, data-dense, live). The current code already seeds this: paper/ink/cobalt/saffron/green tokens in `tailwind.config.ts:7–29`, serif/sans/mono stack at `:31–35`, the tricolor rule in `Masthead.tsx:48–52` and `DeskConsole.tsx:147–151`, bilingual kickers like `kicker mb-3">…भारत का मौसम डेस्क` (`Lede.tsx:40`).

### 1.1 Adjective list — the design should *feel*
| Axis | Adjectives |
|---|---|
| Overall | **Authoritative, editorial, precise, warm, dignified, alive** |
| Public page | **Cinematic, readable, generous, trustworthy, monsoon-fresh** |
| Desk console | **Operational, dense, decisive, bilingual, calm-under-pressure** |
| Data layer | **Fast, legible, tabular, unambiguous** |
| India-ness | **Officially Indian, not decorative** — tricolor used as one restrained 4px rule + saffron/green accents, Devanagari as a living second language, IST everywhere, 36 states, 9-event national taxonomy |

### 1.2 What to avoid
- **Cartoon "weather app" clichés** — emoji suns/clouds, glossy gradients, blue-`radial-gradient` hero cards.
- **Generic SaaS look** — flat indigo buttons repeated everywhere, purple gradients, interchangeable "dashboard" cards with no editorial hierarchy.
- **Tricolor overuse** — flag colors as a full nav background or wallpaper read as costume; the existing 4px top rule is the correct dose.
- **Unchecked single-use hexes** — today `TrendCharts.tsx:17–18` (`#2563EB`, `rgba(37,99,235,0.12)`) and `IndiaMap.tsx:16–23, 92–93, 99–100, 106, 115–131, 164` hard-code colors that drift from tokens. Every color should resolve to a named token.
- **Dark-by-default UI** — except the map band's cinematic dark frame (see §3.5), light editorial paper is the product identity.
- **Vague micro-labels** — every number should state its unit (°C / mm / km/h / IST) and its source; that's the "real product" tell.

### 1.3 Editorial rhythm (applies across sections)
Every page section follows the same spine so a judge can parse the page instantly:
1. `kicker` — mono, 11px, uppercase, 0.18em tracking (already in `globals.css:41–43`);
2. **serif h2** — `serif-display` 2xl→3xl, tight tracking (`MapBand.tsx:112–113`, `TrendCharts.tsx:44`, `StoryFeed.tsx:17`, `ReportModal.tsx:70`);
3. content block with consistent 8px spacing steps;
4. a closing mono footnote (units, source, legality — e.g., the Census-2011 disclaimer `MapBand.tsx:229–232`).

---

## 2. Full Token Specification

### 2.1 Color palette

#### 2.1.1 Core neutrals (extend/keep)
Current values in `tailwind.config.ts:7–30`. Keep these; add two refinements.

| Token | Current | Recommendation |
|---|---|---|
| `ink` | `#1A232E` | Keep. Body + primary text. 14.4:1 on paper. |
| `inksoft` | `#3C4754` | Keep. **Promote from "unused" to the standard secondary-text token** (replaces `text-ink/70` and most `text-muted` on paper). |
| `paper` | `#F7F4EE` | Keep. Page background. |
| `paperdeep` | `#EFEAE0` | Keep. **Track/well/tint** backgrounds and skeleton base. |
| `card` | `#FFFFFF` | Keep. Cards, chips-on-white, map chrome. |
| `line` | `#E4DED0` | Keep. Hairlines, borders, dividers. |
| `muted` | `#667085` | Keep but **re-scope**: allowed only for decorative/disabled/legal-footnote text ≥ 12px on `card` (4.98:1 pass) — it fails at small sizes on `paperdeep` (≈4.15:1, below AA). See §5. |
| *(new)* | — | Add `muted-strong` (≈ `#475467`) for "secondary but meaningful" metadata (source · time · id) on paper/paperdeep. |

#### 2.1.2 Brand semantic colors
| Token | Current | Role |
|---|---|---|
| `cobalt` `#2563EB` (+ 50/100/400/600/700) | `tailwind.config.ts:14–20` | Primary action, links, selection, map cluster/selected tints. Extend scale with `cobalt-400: #5E8AEF` for gradients on hover/link underlines. |
| `saffron` `#E8622C` | `:21` | Attention/queue/triage accent, heatwave. For **text** on white use `saffron-600`‑style dark pass `#C2410C` (5.2:1). Add the pair. |
| `green` `#1E9E67` | `:22` | Verified / success / auto-verified. Text on white needs `green-deep #147A50` (5.35:1) at 11–12px. |
| `hazard` `#D92D20` | `:24` | Reject / danger / duplicate / dust-storm dot today. 4.83:1 on white — acceptable for text; keep. |
| `bay` `#0E7FB0` | `:23` | Flooding. Borderline 4.49:1 on white for small text; add `bay-deep #0C6E99`. |

#### 2.1.3 Event-type taxonomy colors (the 9-event India palette)
Source of truth: `EVENT_META` in `src/lib/eventMeta.ts:12–85` + `EVENT_COLOR` at `:99–101`. **Problem:** the `dot`/`chip` classes and `mapColor` drift apart for 5 of 9 events, and three events share the `dune` chip:

| Event | dot (current) | chip (current) | mapColor (current) | Issue |
|---|---|---|---|---|
| flooding | `bg-bay` | bay-toned | `#0E7FB0` | ✓ consistent |
| heatwave | `bg-saffron` | saffron-toned | `#E8622C` | ✓ consistent |
| cold_wave | `bg-ice` (#59A6C8) | ice-toned | `#3E7FA8` | ✗ dot ≠ mapColor |
| cyclone | `bg-velvet` | velvet-toned | `#5A4BD1` | ✓ consistent |
| thunderstorm_hailstorm | `bg-dune` | dune-toned | `#B78A3F` | ✗ shared with landslide/drought |
| dust_storm | `bg-hazard` (#D92D20) | hazard-toned | `#C05621` | ✗ dot ≠ mapColor (and dot collides with "reject") |
| fog_smog | `bg-mists` | mists-toned | `#7B8794` | ✓ consistent |
| landslide | `bg-dune` | dune-toned | `#8A6B46` | ✗ shared dune |
| drought | `bg-dune` | dune-toned | `#C2A010` | ✗ shared dune |

**Prescription — one palette, one mouthpiece.** Introduce dedicated tokens for each hue and make `dot`, `chip`, `legend`, and `mapColor` all reference the same value:

```ts
// proposed eventMeta vocabulary (single source per event)
flooding:            { color: "#0E7FB0", dot: "bg-bay",  chip: "border-bay/30 bg-bay/10 text-bay-deep"  }
heatwave:            { color: "#E8622C", dot: "bg-saffron", chip: "border-saffron/30 bg-saffron/10 text-saffron-deep" }
cold_wave:           { color: "#3E7FA8", dot: "bg-frost",  chip: "border-frost/30 bg-frost/10 text-frost-deep" }
cyclone:             { color: "#5A4BD1", dot: "bg-velvet", chip: "border-velvet/30 bg-velvet/10 text-velvet-deep" }
thunderstorm_hailstorm: { color: "#B78A3F", dot: "bg-dune", chip: "border-dune/30 bg-dune/10 text-dune-deep" }
dust_storm:          { color: "#C05621", dot: "bg-sand",   chip: "border-sand/30 bg-sand/10 text-sand-deep" }
fog_smog:            { color: "#7B8794", dot: "bg-mists",  chip: "border-mists/30 bg-mists/10 text-mists-deep" }
landslide:           { color: "#8A6B46", dot: "bg-earth",  chip: "border-earth/30 bg-earth/10 text-earth-deep" }
drought:             { color: "#C2A010", dot: "bg-olive",  chip: "border-olive/30 bg-olive/10 text-olive-deep" }
```

New `tailwind.config.ts` colors to add: `frost: #3E7FA8`, `sand: #C05621`, `earth: #8A6B46`, `olive: #C2A010`, plus text-safe deeps (`saffron-deep #C2410C`, `green-deep #147A50`, `bay-deep #0C6E99`, `frost-deep #2C5F83`, `velvet-deep #4538B5`, `dune-deep #8B6524`, `sand-deep #97451A`, `mists-deep #5D6B78`, `earth-deep #6E4E2E`, `olive-deep #8F7A0C`). Keep `ice` for non-event ice accents, or retire it to avoid confusion.

Rationale: map pins (`IndiaMap.tsx:41–55` reads `EVENT_COLOR`), chips/dots in `TrendCharts.tsx:84–103`, `MapBand.tsx:143–160`, `StoryFeed.tsx:28–34`, `QueueWire.tsx:39–44`, and the `Sparkline`/`by_state` bars all currently reach for different hexes; one `eventMeta` record per event ends the drift and lets the map and the UI never disagree.

#### 2.1.4 Status colors (admin)
`STATUS_META` in `eventMeta.ts:103–110` is the product truth. `IndiaMap.tsx:16–23` re-declares its own `STATUS_COLOR` and **drifts**: `auto_rejected` is `#B8B2A6` on the map but `#64748B` in `STATUS_META`; `auto_verified` matches green, `verified` is `#15803D`. Prescription: delete the local map table; import/derive admin point colors from `STATUS_META.color`. It costs nothing and guarantees the pill a judge sees beside a wire matches the dot on the admin map.

| Status | Base | On-map role |
|---|---|---|
| pending | `#98A2B3` | neutral, full opacity, breathing pulse |
| ai_flagged | `#B7791F` | amber alert, full opacity |
| auto_verified | `#1E9E67` | green, full |
| verified | `#15803D` | deep green, full |
| auto_rejected | `#64748B` | gray, dimmed on map (opacity 0.55) |
| rejected | `#D92D20` | red, dimmed (0.45) |

The dimming logic at `IndiaMap.tsx:67–75` is good — keep, but drive opacity from the same single source.

### 2.2 Typography system

Current stack in `tailwind.config.ts:31–34`. Keep as-is (it already ships Devanagari fallbacks). Refine usage rules:

| Role | Face | Size / Weight | Leading | Usage |
|---|---|---|---|---|
| Masthead wordmark | serif | 2xl→3xl, bold, tight | 1.1 | `Masthead.tsx:56` |
| Page hero (h1) | serif `serif-display` | 4xl→5xl, semibold, tight | 1.1–1.2 | `Lede.tsx:41–43` |
| Section title (h2) | serif | 2xl→3xl, semibold | 1.2 | `MapBand`/`TrendCharts`/`StoryFeed` |
| Card title | serif | lg, semibold | 1.3 | `SelectedStory.tsx:33`, `StoryFeed.tsx:40`, `QueueWire.tsx:56` |
| Hero/stat numerals | serif | 3xl–4xl, semibold, **`tabular-nums`** | 1.05 | `Lede.tsx:18`, `TrendCharts.tsx:51` |
| Body | sans | base (16px) / sm (14px) | 1.6–1.7 | news copy, meta |
| Kicker | mono | 11px, **700**, uppercase, `tracking-[0.18em]` | 1.4 | globals `.kicker` |
| Data readouts (counts, scores, ids, coords, times) | mono | 11–13px, `tabular-nums` | 1.4 | `WhyVerified.tsx:9–12`, `QueueWire.tsx:45, 68–77`, `ReportModal.tsx:86, 94` |
| Chips/pills | sans | 11px, medium–semibold, `tracking-wide` | — | globals `.chip` |
| Legal footnotes | sans | 11px | 1.5 | `MapBand.tsx:229–232`, `Footer.tsx:44` |

Concrete prescriptions:
- Add `font-variant-numeric: tabular-nums` to all stat/mono readouts (`Lede.tsx:18`, `TrendCharts.tsx:51–53, 68, 93`, `WhyVerified.tsx:11`, `DeskConsole.tsx:66`). Right-aligned mono columns then line up like a newsroom ticker.
- Convert `text-ink/70` (body) and most `text-muted` (metadata) to `text-inksoft` for AA headroom; reserve raw `muted` for footnotes and disabled text.
- Devanagari inline needs +2px leading vs Latin (Noto Devanagari's tall matras clip at tight line-heights): when a line mixes `जनमौसम` or `संपादन कक्ष` with body copy, prefer `leading-relaxed`/`leading-7` over `leading-snug` (`AdminAuthGate.tsx:33`, `DeskConsole.tsx:159`).

### 2.3 Spacing, radius, border, shadow scale

**Spacing** — the existing code already lands on a 4px-based rhythm (2/3/4/6/8/12/16/24/32/40/48). Formalize as: `--space-1: 4px` grid → `2, 4, 8, 12, 16, 24, 32, 48, 64`. Use `gap-*`, `px/py-*`, and `space-y-*` consistently; do **not** introduce 7px, 11px, 18px one-offs. Existing minor offences (`px-2.5 py-1`, `p-1.5`) are acceptable *inside* compact chips; formalize them as a "compact chip" recipe instead of ad-hoc.

**Radius scale:**
| Class | Value | Use |
|---|---|---|
| `rounded-md` | 6px | small controls, selects inside map chrome |
| `rounded-lg` | 8px | buttons, inputs, inner cards (`WhyVerified` box), icon tiles |
| `rounded-xl` | 12px | `.card`, map chrome panels, popups |
| `rounded-2xl` | 16px | map container, modals, auth card |
| `rounded-full` | pill | chips, FAB, status dots |

**Border:** line `#E4DED0` for hairlines; a **section rule** upgrade: `StoryFeed.tsx:15` already uses `border-b-2 border-ink` — extend that "heavy editorial rule" language to Lede and MapBand section headers for a consistent newspaper spine.

**Shadow/elevation (extend `tailwind.config.ts:36–39`):**
| Token | Value | Use |
|---|---|---|
| `shadow-soft` | current | resting cards |
| `shadow-lift` | current | floating cards, map, modals, FAB |
| *(new)* `shadow-hover` | `0 2px 4px rgba(26,35,46,0.08), 0 14px 32px -12px rgba(26,35,46,0.22)` | card hover |
| *(new)* `shadow-map` | `0 0 0 1px rgba(26,35,46,0.08), 0 24px 64px -20px rgba(26,35,46,0.4)` | cinematic map frame inset shadow |
| *(new)* ring recipe | `ring-2 ring-cobalt/60` | selected wire (`DeskConsole`/`QueueWire` already uses) |

### 2.4 Motion durations & easing

Keep existing keyframes in `tailwind.config.ts:40–63` (`pulse-dot`, `ticker-in`, `card-in`, `fade-in`); add and standardize:

| Token | Value | Applies to |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | color/border transitions, hover |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | entrances (cards, modal, story panel) |
| fast | 120–150ms | hover, chip active, icon micro-interactions |
| normal | 250–300ms | card hover lift, accordion (`details`), filter transitions |
| slow | 400–600ms | ticker swap (current 0.55s is right), modal in, map flyTo (~900ms in `IndiaMap.tsx:204`) |
| narrative | 1.8s | pulse-dot (kept) |

New keyframes to add: `skeleton-shimmer` (for skeleton rows, replacing only `animate-pulse` with a paper→paperdeep→paper shimmer at ~1.4s), `fade-slide` (map story card + modal), `pin-pop` (new pin/spot pulse on the public map, ~0.35s scale 0→1 with a fading halo).

**Every entrance/hover animation gets a `motion-reduce:` off-switch** (`motion-reduce:animate-none`, `motion-reduce:transition-none`) — see §5.

---

## 3. Component-by-Component Visual Spec

Every component read: `home/*` (HomeView, Masthead, Lede, MapBand, TrendCharts, StoryFeed, WhyVerified, ReportModal, Footer), `admin/*` (AdminAuthGate, DeskConsole, QueueWire, PromoteModal), `map/IndiaMap.tsx + MapCanvas.tsx`, `ui.tsx`, `icons.tsx`, plus `app/layout.tsx`, `globals.css`, `tailwind.config.ts`.

Each entry: **Current → Elevate** (concrete, class/token-level).

### 3.1 `app/layout.tsx` + `globals.css` (global skin)
**Current:** `layout.tsx:19–22` bare `<body class="min-h-screen bg-paper">`; `globals.css` defines `:root` CSS vars for only 5 colors (`:6–12`) that Tailwind never reads, then hand-written component classes and MapLibre skin (`:74–103`); `scroll-smooth` on `<html>` (`layout.tsx:20`).

- **Elevate:** make `:root` the single token layer by listing *all* palette colors as `--` vars (or remove the dead vars so there's one source of truth). At minimum, wire the vars the map and sparkline already reference (`--cobalt`, `--saffron`, `--green`) so `IndiaMap.tsx` and `TrendCharts.tsx` stop hard-coding hex.
- Add `html { scroll-padding-top: 7rem; }` so sticky masthead (`Masthead.tsx:47`) never overlaps anchor targets `#map/#analysis/#live`.
- Global focus baseline in `@layer base`: `:focus-visible { outline: 2px solid var(--cobalt); outline-offset: 2px; }` — many interactive elements (nav links, filter pills, selects with `outline-none` in `MapBand.tsx:167, 185`) currently have no keyboard affordance.
- Keep the scrollbar skin but tokenize the thumb `#d4cdbd` → `line`/`paperdeep`-derived.
- MapLibre skin: keep, but express sidebar/ctrl colors through tokens (`border: 1px solid theme("colors.line")`, `button { color: theme("colors.ink") }`), and add a visible focus ring for the map canvas for keyboard users (see §5).
- Add `body { color-scheme: light; }` and keep `themeColor: "#1a232e"` — fine for a paper product.

### 3.2 `ui.tsx` shared primitives
**Current:** `StatusPill` (chip + colored dot, `:4–15`), `Kicker`/`SectionTitle` (`:17–39`), `Spinner` (`:41–48`), `SkeletonRows` (`:50–58`, plain `animate-pulse` bars), `EmptyState` (`:60–66`).

- **StatusPill →** keep API `chips`; ensure the pill `color` and `StatusPill`'s inline dot (`ui.tsx:11`) read the same `STATUS_META` value (mirror of §2.1.4). Add a slow breathing pulse to `pending` only (`animate-pulse-dot` is already defined) so the desk reads "alive". Re-map chip text colors to `*-deep` variants for AA on white (§5 table).
- **SkeletonRows →** replace `animate-pulse bg-paperdeep/70` with a `skeleton-shimmer` gradient block; add a small mono caption row option so skeletons carry real structure (kicker line + 2 short bars + pill). Used at `DeskConsole.tsx:191` and loaders — this is the first thing a judge sees on `/admin`, so it must look intentional, not like boxes.
- **EmptyState →** add an icon slot (default `IconShield`/`IconCheck`), `animate-fade-in` wrapper, and for the "Queue is clear" case use green + a soft green ring — turning an empty screen into a small celebratory moment (`DeskConsole.tsx:225`).
- **Spinner →** keep for map canvas (`MapCanvas.tsx:8–12`) but standardize color to `border-line border-t-cobalt` (already correct) and 20px.

### 3.3 `Masthead.tsx` (public header + FAB)
**Current:** sticky, paper/95 blur, 4px tricolor rule (`:48–52`), serif wordmark + Hindi mark (`:55–58`), date + mode chip (`:60–70`), 4-link nav with two `text-ink/60` links (`:73–86`), ticker bar `bg-card/60` (`:88–92`), cobalt FAB (`:94–100`).

- **Current → Elevate:**
  - **Header as two-band system:** keep the tricolor hairline but add a *hairline-plus-shadow* treatment on scroll (already cognitive via `shadow` — formalize `shadow-[0_1px_0_var(--line)]`). Give the left wordmark a tiny mark: a 16px rounded square `bg-ink` with a saffron droplet dot or the wordmark "ज" — one small glyph makes the brand unmistakable at a glance.
  - **Nav:** bump `gap-5` stays; add `rounded-md px-2.5 py-1.5 hover:bg-paperdeep` + `focus-visible:ring-2 ring-cobalt/50` on each link; give the current section an active "ink underline" recipe (judge scroll → they see where they are). Make `/admin` "Desk" a proper secondary button (`btn-secondary !px-3 !py-1.5 text-xs`) instead of a bare text link (`:78–81`) — it's a second destination and should look like one. Language `हिन्दी` (`:82–85`) becomes a segmented mini-toggle `EN | हिन्दी` (non-functional in this pass; but visually it reads "bilingual product").
  - **Mode chip:** keep the LIVE/DEMO polarity but give LIVE a faster tempo: `border-green/40 bg-green/10 text-green` + pulsing dot (already `:62–69`) — add `tabular-nums` to the date.
  - **Ticker (`LatestFlash`):** the `New /` badge is good (`:29–31`); elevate the row to a full-width "desk flash" with a slim left saffron rule, mono time `text-muted-strong`, and a `motion-reduce:animate-none` guard (`ticker-in` at `:32`). Increase rotation interval feeling by easing the swap (keep 4s, add `transition` on text color).
  - **FAB (`:94–100`):** keep position/z; add `shadow-lift` → `shadow-hover` on hover, a `focus-visible:ring-2 ring-white/60`, and a tiny count badge (reports this hour) to justify the floating action.
  - **Mobile:** the nav row is not hidden and can crowd at <640px; prescribe `hidden sm:flex` for the mid links and a minimal `IconMenu` button placeholder (visual only).

### 3.4 `Lede.tsx` (hero + stats)
**Current:** kicker + serif h1 (4xl/5xl) + lede paragraph (`:39–49`), 4 vertical-ruled stats with serif numerals (`:51–56`), trust/event/clock meta strip (`:58–76`).

- **Elevate:**
  - Add a short **saffron rule** (2px × 56px) under the kicker or 12px left of the h1 — a classic editorial "dateline" accent that also answers "is this India?" instantly.
  - Stat values: add `tabular-nums`; label line: switch `text-xs text-muted` → `text-xs text-muted-strong` and consider a Devanagari sub-caption (`पुष्ट घटनाएँ`, `राज्य रिपोर्टिंग`) in `text-[10px] text-muted` beneath each label — bilingual stat blocks are the most "Indian-data-studio" single move available.
  - Queue stat accent `text-saffron` (`:55`) → `text-saffron-deep` for AA.
  - Meta strip (`:58–76`): replace `text-muted` icons+text with `text-inksoft`, give `IconShield` a green tint for the verified clause (e.g., `text-green` icon + `font-medium text-green-deep`), and set "Last update" in mono `tabular-nums`.
  - Add a `scroll-mt-28` on the section and an entrance `animate-fade-in`.

### 3.5 `MapBand.tsx` + `IndiaMap.tsx` + `MapCanvas.tsx` (the centerpiece) — includes dark-tile data cards
**Current:** light section, map container `h-[58vh] min-h-[430px] rounded-2xl border-line shadow-lift` (`:121`), overlay chips/selects/legend as `bg-card/90` glass (`:134, 165, 208`), `SelectedStory` as white card (`:23–64`), map fills `#FBF8F1` with `#C9C0AC` borders (`IndiaMap.tsx:92–93`).

This is the demo's hero — prescribe a **cinematic dark-tile frame** that stops the page from feeling like "another light dashboard":

- **Dark-tile map band backdrop.** Wrap the map band section header + map in a near-black ink panel: section `bg-ink` (padding `py-10 sm:py-14`), header kicker becomes `text-paper/60`, h2 becomes `text-paper`, the bounding-box note becomes `text-paper/70`. The map itself stays **light** (`india-fill` on paper, per the Digital India Portal side) but gets `border-4 border-ink/80` or `ring-1 ring-white/10` + the new `shadow-map` — a "photograph in a dark mat" moment. Event filter chips, district search, legend, and `SelectedStory` become **dark glass tiles** (`bg-ink/70 backdrop-blur border-white/10 text-paper`) instead of light glass. This is where "Monsoon Data Studio" meets "control room," and the light India map pops like a lit-up board.
- **Legend (bottom-left, `:208–217`):** dark glass, `text-paper/80`; add one row per active event hue *with count*, e.g. `dot + label + mono count`, plus the "Click a pin for the full story" hint. Keep the verified-count chip.
- **Event-color pins:** keep `EVENT_COLOR`-driven match expression (`IndiaMap.tsx:42–55`) — after §2.1.3 it is already unified. Enhance pin affordance:
  - `events-glow` halo: bump `circle-blur` from 1 → 1.2 and public radius 16 → 18, at `opacity 0.25` — softer "monsoon radar" bloom.
  - `events-point`: public radius 7 → 8; stroke white 1.5 → 2 for separation from the dark frame.
  - Add **selected-states ring** visual language: when a pin is selected (`events-selected`, `IndiaMap.tsx:159–169`) do a two-ring treatment — outer halo ring `#FFFFFF` width 2, inner `#1B3FAA` (cobalt-700) — and gently *fly the story card* in (`animate-card-in` already at `MapBand.tsx:24`).
  - **District highlight** (`IndiaMap.tsx:94–107, 310–320`): raise `fill-opacity` 0.09 → 0.12, keep the dashed `#2563EB` line but widen to 1.6, and add a **state-level ring** when only a state (no district) is tracked: `india-border` width 0.6 → 1.1 on the matched state (`["==", ["get", "state"], …]` filter needs a `state-hl-line` layer addition).
  - **Cluster glow** (`:108–131`): keep the radial glow; reduce `cluster-circle` fill-to-white *contrast* by using cobalt-700 `#1B3FAA` at opacity 0.92 with an inner ring, and add a **`cluster-count` symbol layer** (white `font-mono` labels, 10px, `text-halo-color: #1A232E`, `text-halo-width: 1`) so clusters read as *data* rather than abstract blobs. Judges recognize count labels instantly as "real."
  - **New-pin arrival:** on live refresh, animate the newest feature — prescribe a `pin-pop` keyframe on a temporary halo layer (or a `data-arrival` attribute driving CSS) per §2.4; in mock mode it can play once per refresh for the demo.
- **Map controls chrome:** style the MapLibre nav control (bottom-right, `IndiaMap.tsx:235`) via `globals.css` tokens (`:84–97`): rounded-10, `border-line`, ink icons, hover `bg-paperdeep`. Attribution further compacted to a 9px mono slug.
- **District search (`MapBand.tsx:164–205`):** dark-glass panel; the `<select>`s get custom chevrons, `focus-visible:ring-2 ring-white/30`, `font-medium text-paper`, and a `text-paper/50` placeholder option. "Track a state / district" becomes a fuller control: two stacked selects in glass (already) + "Clear tracking" as a glass button.
- **SelectedStory (`MapBand.tsx:12–67`):** keep width 400px panel; elevate to dark glass with `border-white/10`, headline `text-paper`, body `text-paper/80`, meta `text-paper/60`; event chip keeps its hue but gets `bg-white/10` ring. Add a **4px left color strip** in the event's hue — instant visual classification when multiple cards stack. The `How was this verified?` disclosure stays cobalt-on-paper? On dark, switch to `text-[#9dbcf7]`-style light cobalt (`hover:text-[#c7d9ff]`).
- **MapCanvas loading (`MapCanvas.tsx:6–13`):** replace the spinner with an **India-shaped skeleton** — a centered shimmer block mimicking the `india-states.geojson` silhouette + "Loading the live map…" caption. Small, but it tells the judge the map cares about India even before tiles load.
- **Disclaimer line (`MapBand.tsx:229–232`):** keep, restyle as `text-paper/50` on the dark band (it lives inside the section now).

### 3.6 `TrendCharts.tsx` (analysis row)
See §4 for the full data-viz spec. Short version: three equal cards (grid at `:47`), but each card gets a **data-viz header recipe**: kicker + big serif number + mono unit/sub-line; bars gain rounded caps, value labels, and tabular numerals; sparkline is redrawn from tokens with a live end-dot.

### 3.7 `StoryFeed.tsx` (verified wires)
**Current:** heavy editorial header `border-b-2 border-ink` (`:15`), white cards, chips, serif titles, `Why was this verified?` details (`:55–62`).

- **Elevate:** card gets the same **left 3px event-hue strip** (`rounded-xl overflow-hidden border-l-4` with inline `style={{borderLeftColor: meta.mapColor}}` or a token class) so the feed reads as a color-indexed wire list; hover lifts with `shadow-hover` + `translate-y-[-2px] transition`. Headline is already serif — add `leading-snug`; the source/time line (`:35–37`) → `text-muted-strong font-mono`. The `details` summary keeps `text-cobalt font-semibold` but adds a `group-open:` chevron rotation and `transition` (if a rotate affordance is added); ensure `motion-reduce:transition-none`.
- Grid: `md:grid-cols-2 gap-6` is right; on `lg` consider `lg:[&>*:first-child]:col-span-2` lead-story treatment for the newest verified wire — an editorial "top story" beat that a judge recognizes from newspaper design.

### 3.8 `WhyVerified.tsx` (desk filing)
**Current:** cobalt-tinted box (`border-cobalt/20 bg-cobalt-50/60`), shield heading, divide rows, mono values, footnote (`:29–51`).

- **Elevate:** add a **trust-score bar** — a 4px rounded track (`bg-cobalt-100`, fill `bg-ink`) or confidence gradient (green≥0.66, amber 0.35–0.65, red<0.35 to mirror the pipeline thresholds) so the score is glanceable, not just `0.813` in mono. Keep rows mono `tabular-nums`; right-align values (`text-right` already at `:11`). Heading row gets the `IconShield` in cobalt-700 (already) — add `tabular-nums` to `Row` value span and elevate the divider color `divide-cobalt/10` → `divide-line`. On dark map panel reuse (SelectedStory), this box becomes `bg-white/5 border-white/15 text-paper/85` variant.

### 3.9 `ReportModal.tsx` (citizen report)
**Current:** ink/40 overlay + blur (`:59`), white card, two-column form, result receipt grid (`:83–100`), duplicate banner (`:101–105`).

- **Elevate:**
  - Entrance: `animate-card-in` + `motion-reduce:animate-none`; backdrop `bg-ink/40` → `bg-ink/55`.
  - Header: move kicker + title into a bordered head with a 4px saffron top rule (signals "this is the citizen path," distinct from desk actions); close button `p-1` → `p-1.5 rounded-lg` (min 32px target).
  - Quick locations (`:131–137`): convert to **selectable city chips** (10 pill buttons in a wrap, active = `bg-ink text-white`) — faster for judges to demo than a dropdown, and shows 10 real Indian metros at a glance.
  - Lat/lon inputs (`:140–149`): keep mono (`font-mono text-xs` already) but add `tabular-nums` and a subtle "inside India bounds" hint (`68.1°E–97.4°E · 6.5°N–35.5°N`).
  - Success state: "Received by the desk ✓" (`:79–81`) — add `IconCheck` in a green circle and make the receipt grid cards `bg-paperdeep` → `bg-cobalt-50/50 border border-cobalt/10` with mono ids; promote the acknowledgment id (`:86`) to `text-cobalt-700 text-[11px]` — judges love seeing a real ID.
  - Error banner (`:151–153`): `border-hazard/30 bg-hazard/10 text-hazard` is fine; add `role="alert"` (behavior, but note it).

### 3.10 `Footer.tsx`
**Current:** `border-t border-line bg-paperdeep/50`, 3 columns, bottom legal bar (`:4–47`).

- **Elevate:** top border becomes a 4px tricolor rule (mirror of the masthead — bookends the page); column headings keep `.kicker`; the "How trust works" bullets gain `IconCheck` green ticks instead of `·`; the CTA links (`:35–41`) become `btn-secondary !px-3 !py-1.5 text-xs` so the footer closes with two real actions; bottom bar (`:44`) becomes mono `text-[11px] text-muted` with the "IMD authoritative" line separated. Optionally a final `.kicker`-style colophon "JanMausam · जनमौसम · demo 2026".

### 3.11 `AdminAuthGate.tsx`
**Current:** centered paper screen, white card, ink icon tile (`:29`), serif title, password input, primary CTA (`:43`).

- **Elevate:** screen gets a **dark ink editorial backdrop** (if it matches the desk identity) or a paperdeep tint with a subtle India-outline watermark (very cheap: the geojson silhouette at 4% opacity). Icon tile: `bg-ink` → `bg-cobalt` (or keep ink; both fine) with a `shadow-soft`; subtitle `संपादन कक्ष` in serif italic `text-muted-strong`; input already `.input` — add `font-mono` to the password for desk feel; error line `text-hazard` stays; helper (`:46–49`) in `text-[11px] text-muted`. Entrance `animate-card-in`.

### 3.12 `DeskConsole.tsx`
**Current:** sticky header reuse (tricolor, ink tile, LIVE/DEMO chip `:163–165`), `StatsStrip` cards (`:39–71`), status filter pills (`:196–221`), queue column + sticky map column (`:245–268`).

- **Elevate:**
  - **StatsStrip** (`:39–71`): cards get a **left 3px status-hue bar** (cobalt/bay/green/saffron/velvet dots already exist — promote to strips) and `tabular-nums` serif figures; add a tiny 12-month-in miniature trend sparkline to "Queue depth" if feasible (visual-only). Skeleton variant (`:42–47`) uses the new shimmer recipe.
  - Header: raise icon tile to `rounded-xl w-10 h-10`, add `shadow-soft`; LIVE chip reuse of `Masthead` recipe; "polls 5s" (`:164`) in mono.
  - Status pills (`:196–221`): active pill = `bg-ink text-white` (All) or `chip … bg-white` (status) — elevate to a **segmented control** with equal-height `h-7`, hover `bg-paperdeep`, focus rings; include per-status counts (`label (n)`) — judges immediately understand triage volume.
  - Queue column: apply `QueueWire` elevation; grid `lg:grid-cols-[1fr_420px]` keep.
  - Admin map column (`:245–268`): on the light paper skin keep chrome light; but match the `StatusPill` legend row (`:258–267`) styling to the glass recipe with proper dots; "reset view" stays `link-underline`.
  - The whole `main` (`:145`) keeps `bg-paper`; consider `pb-24` so floating elements never cover last wires.

### 3.13 `QueueWire.tsx`
**Current:** card, `StatusPill` + event chip row (`:36–48`), headline/text (`:50–62`), mono meta (`:63–77`), desk filing disclosure, action buttons (`:90–102`), selected ring `ring-2 ring-cobalt/60` (`:34`).

- **Elevate:**
  - **Selected state:** keep `ring-2 ring-cobalt/60` but add `shadow-lift` + a 3px left cobalt bar; on hover (unselected) `shadow-soft → shadow-hover`.
  - Status line: keep pill; add the event chip but with `*-deep` text; right side time (`:45`) → `text-muted-strong`.
  - Headline char count: promoted wires already get a saffron "promoted" chip (`:57`) — keep; add `tabular-nums` to ID (`:101`).
  - Trust/conf/corrob (`:68–77`): convert to **three mini data chips** with mono values + tiny 3px bars (conf → cobalt bar; trust → green/amber/red bar by threshold; corrob → bay bar). Dense but instantly readable; this is a desk, not a blog.
  - Actions (`:91–102`): **Approve = green primary** (`bg-green text-white hover:bg-green-deep` — currently `btn-primary` cobalt), Reject = hazard outline (already `!border-hazard/40 !text-hazard`), Promote = secondary; disabled busy state shows a tiny spinner (`animate-spin` `h-3 w-3`) inside the clicking button; all buttons `min-h-[32px]`, focus rings.
  - Add `role="button"`-style affordance: cursor pointer, `select-none` (already), and a subtle `focus-within:ring-2 ring-cobalt/40` for keyboard navigation of card internals.

### 3.14 `PromoteModal.tsx`
**Current:** ink/40 backdrop (`:20–23`), white card, headline input, editor's note, primary CTA (`:57–63`).

- **Elevate:** mirror ReportModal's chrome (rounded-2xl, entrance animation, close button sizing); header gets a **saffron 4px rule** + "Desk promotion" kicker (already `:33`); add a **live headline preview** strip (serif `text-lg`, `tabular-nums` char count `n/72`) — turning the modal into a mini composing room; CTA `btn-primary` → saffron variant? Keep cobalt (desk action) but add `disabled:opacity-60` (already). `aria-label` present.

### 3.15 `icons.tsx`
**Current:** consistent 24px viewBox, 1.8 stroke, round caps, `currentColor` (`:1–15`) — already a system. **Elevate:** prescribe a small recipe (stroke 1.75, default 18px, `stroke-width` 1.8 for 16–18px, 2 for 12–14px), ensure every icon accepts `className` (they do via `SVGProps`), and add event glyphs if time allows (water drop for flooding, sun for heatwave, snowflake for cold, spiral for cyclone, bolt for thunder/hail, wind lines for dust, haze for fog/smog, slope for landslide, cracked-earth for drought) — the 9-icon set is the single most "real product" signal you can add to a weather UI.

---

## 4. Data-Viz Styling Spec (TrendCharts + stat readouts)

Applies to `TrendCharts.tsx:1–109` and the numeric readouts in `Lede`, `DeskConsole`.

### 4.1 Shared rules
- **Color:** every series resolves to a token — velocity = cobalt (`--cobalt`), by-state = cobalt gradient, event-mix = `EVENT_META[e].mapColor` (already correct at `:98`). No raw hexes in chart code.
- **Type:** captions `.kicker`; values as **big serif numerals with `tabular-nums`** (Glanceable number rule: value is a headline, unit is a mono footnote). Labels `text-xs text-muted-strong`.
- **Zero baseline:** bars and sparkline area always start at zero — never truncate (current `max` logic at `:8` is fine; add an explicit note not to "zoom" the y-axis visually).
- **Grid & ticks:** only 1–2 faint guide lines (`stroke-line` at 8% ink) for the sparkline; bars get no grid — the track (`bg-paperdeep`) *is* the grid.

### 4.2 Velocity sparkline (card 1, `:48–59`)
- Redraw from tokens: stroke `var(--cobalt)` (or `#2563EB` token), area fill = **linear gradient** cobalt `0.22` → transparent (SVG `<defs><linearGradient>` with stop opacity 0.22 → 0).
- Add a **live end-dot**: a 5px cobalt-700 circle at the last point with `animate-pulse-dot` (motion-safe only) — signals "this is a live feed" even in mock mode.
- Animate `stroke-dashoffset` draw-in on mount (`motion-reduce:animate-none`), 700ms ease-out.
- Add faint hour tick marks (`<circle>` at each point, `r=1`, `fill=line`) if points ≤ 12.
- `aria-label` stays (already `role="img"` at `:16`); add `<title>` = "Reports per hour, last N hrs".

### 4.3 By-state bars (card 2, `:61–79`)
- Bars `h-1.5` → `h-2.5` with `rounded-full`; fill = `bg-gradient-to-r from-cobalt to-cobalt-400` (or solid `bg-cobalt`); **value labels right-aligned in `font-mono tabular-nums text-ink`** (moved out of `text-muted`).
- State names `text-[13px] text-inksoft font-medium`; add a mono "top 6 of N states" sub-caption.
- Hover: `group-hover:` the bar fills to `cobalt-600` with a 150ms transition — plus `title`/`aria-label` describing `state: count reports`.

### 4.4 Event-mix bars (card 3, `:81–105`)
- Keep per-event `mapColor` fills (already `:98`); raise bar height to `h-2.5` + rounded caps; keep the dot + label (`:89–92`).
- Restore **empty events as disabled ghost rows** vs filtering them out — or keep filter but show a "9 taxonomy classes · N active" caption; judges should see the taxonomy scope in one glance.
- Add count on the right in `font-mono tabular-nums` (`:93` already) — promote to `text-ink` for legibility.
- Optional donut companion on `lg`: a mini 9-hue donut (concentric colored arcs) next to the bars — reinforces the "national taxonomy" story. Visual-only if implemented later.

### 4.5 A11y layer for charts
- All svg have `role="img"` + descriptive `aria-label`; bars carry `role="img" aria-label` or a visually-hidden `dl` table of values; `tabular-nums` everywhere; no color-only encoding — always pair hue with text label (dots + labels current pattern is correct) — and optionally icon glyphs per §3.15.

---

## 5. Accessibility-Conformance Notes (token/CSS level)

### 5.1 Contrast — the concrete math
Existing risk: small (11–12px) colored text on white (`chip` elements), and `text-muted` on `paperdeep`.

| Pair (current) | Ratio | Verdict | Fix |
|---|---|---|---|
| `text-ink` on `paper` | 14.4:1 | ✓ AA/AAA | keep |
| `text-ink/70` (Lede/StoryFeed body) on `paper`/`card` | ≈7.5:1 | ✓ | keep as ceiling |
| `text-muted` (#667085) on `card` | ≈5.0:1 | ✓ AA large, AA normal | acceptable |
| `text-muted` on `paperdeep` (chips, skeletons, track labels) | ≈4.2:1 | ✗ AA normal | use `text-muted-strong` (#475467) or `text-inksoft` |
| `text-saffron` (#E8622C) 11px on white | 3.4:1 | ✗ | `text-saffron-deep #C2410C` (5.2:1) |
| `text-green` (#1E9E67) 11px on white | 3.4:1 | ✗ | `text-green-deep #147A50` (5.35:1) |
| `text-bay` (#0E7FB0) 11px on white | 4.5:1 | ✗ (borderline) | `text-bay-deep #0C6E99` |
| `text-dune` (#B78A3F) 11px on white | 3.1:1 | ✗ | `text-dune-deep #8B6524` |
| `text-hazard` (#D92D20) 11px on white | 4.8:1 | ✓ | keep |
| white on cobalt (`btn-primary`) | 5.2:1 | ✓ | keep |
| `text-paper` on `bg-ink` (dark tile band) | 14.4:1 | ✓ AAA | keep |

Token-level rule: **every semantic color ships a `-deep` sibling used for text at ≤12px**; colored *fills* (bars, pins, dots) may use the base hue because they are large graphical objects (≥3:1, AA graphics) — pairing text beside them uses the deep variant. This is exactly why `eventMeta.chip` needs `text-{hue}-deep` (see §2.1.3).

### 5.2 Focus
- Global: `:focus-visible { outline: 2px solid var(--cobalt); outline-offset: 2px; }` in `globals.css` `@layer base`.
- Interactive components to audit: nav links (`Masthead.tsx:74–85`), filter chips (`MapBand.tsx:135–160`), map selects (`:167, 185` — currently `outline-none` with **no replacement**), legend/cluster buttons, FAB, admin pills, `QueueWire` card + buttons, modal close buttons (bump `p-1` → `p-1.5/p-2` to 32px+), `details summary` (cursor-only today).
- Map accessibility: `MapCanvas` wrapper gets `tabIndex={0}` + `aria-label` (map itself already has `aria-label` at `IndiaMap.tsx:326`); remove the blanket `.maplibregl-canvas { outline: none; }` or replace with a `:focus-visible` ring on the wrapper.
- Modal behavior contract (flag for implementation): focus trap to first input, restore focus to trigger on close, `Escape` to close, `aria-labelledby` on the h2 (currently `aria-label` on dialog only).

### 5.3 Motion-reduced
- `layout.tsx` `scroll-smooth` → keep; add `@media (prefers-reduced-motion: reduce)` in `globals.css` to zero all custom keyframes (`pulse-dot`, `ticker-in`, `card-in`, `fade-in`, new `pin-pop`/`skeleton-shimmer`) and set `scroll-behavior: auto`.
- Per-component guard: `motion-reduce:animate-none` + `motion-reduce:transition-none` on ticker text, FAB scale, card-ins, hover lifts.

### 5.4 Inclusive design
- Touch targets ≥ 32px (44px ideal) — FAB ok, close buttons and filter chips need the bump noted above.
- No color-only state: status/event always rendered as *pill with dot + label text* (current pattern is already correct; keep it in dark-tile variants).
- Text scaling: keep design fluid (already rem-based via Tailwind 16px base); test at 200% zoom — the `h-[58vh] min-h-[430px]` map container and `serif-display` headings survive; watch the `flex-wrap` meta strips (they wrap, good).
- Bilingual labels always carry English + Hindi (`chip` dots, `StatusPill` `title={m.hindi}` at `ui.tsx:8`) — preserve.

---

## 6. Implementation Checklist (ordered, small-batch, hot-swap-safe)

Rules of the road: every change is **class/token-level**; nothing touches `data.ts`, `types.ts`, or adds fetch logic; the mock/live switch is untouched. Batches are ordered so the design systems lands before components, and each batch is independently shippable.

### Batch 0 — Groundwork (no UI change)
- [ ] Add `frontend/src/lib/mapTokens.ts` (or a `palette` section in `eventMeta.ts`) exporting `MAP_TOKENS = { indiaFill: "#FBF8F1", indiaBorder: "#C9C0AC", cluster: "#1B3FAA", selected: "#1B3FAA", district: "#2563EB" }` — single source for `IndiaMap.tsx`.

### Batch 1 — Tokens & global CSS
Files: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`
- [ ] Add colors: `frost`, `sand`, `earth`, `olive`; text-safes: `saffron-deep`, `green-deep`, `bay-deep`, `velvet-deep`, `dune-deep`, `sand-deep`, `mists-deep`, `earth-deep`, `olive-deep`, `frost-deep`; `muted-strong #475467`; extend `cobalt` with `400`.
- [ ] Add shadows `shadow-hover`, `shadow-map`; add keyframes `skeleton-shimmer`, `pin-pop` (motion-safe).
- [ ] `globals.css`: replace dead `:root` vars with the full token list (or delete); add `html { scroll-padding-top: 7rem }`; add global `:focus-visible` ring; add `prefers-reduced-motion` kill-switch; tokenize scrollbar + MapLibre skin classes (ctrl group, attrib, popup).
- [ ] `layout.tsx`: keep themeColor; add `bg-paper` (already) — no structural change.

### Batch 2 — Event & status color unification (config files only)
Files: `src/lib/eventMeta.ts`, (optional) `src/lib/mapTokens.ts`
- [ ] Rewrite `EVENT_META` `dot`/`chip`/`legend`/`mapColor` per the §2.1.3 table (all nine events single-sourced; three new dots `sand`/`earth`/`olive`, `frost` for cold_wave).
- [ ] Remove the stand-alone `STATUS_COLOR` map in `IndiaMap.tsx`; derive from `STATUS_META.color` (keep the opacity case-logic).

### Batch 3 — Shared primitives
Files: `src/components/ui.tsx`, `src/components/icons.tsx` (recipes only)
- [ ] `StatusPill`: swap chip text to `*-deep`; pending dot gets `animate-pulse-dot`.
- [ ] `SkeletonRows`: shimmer gradient recipe; optional mono caption row.
- [ ] `EmptyState`: add icon slot + `animate-fade-in`.
- [ ] Confirm icon recipe (stroke 1.75/1.8/2 by size) — icon files unchanged if already compliant.

### Batch 4 — Public chrome: Masthead, Lede, Footer
Files: `src/components/home/Masthead.tsx`, `Lede.tsx`, `Footer.tsx`
- [ ] Masthead: active nav underlines + `focus-visible`, hover pill bg on links, "Desk" → compact secondary button, `EN | हिन्दी` toggle, mono date `tabular-nums`, ticker saffron rule + motion-reduce, FAB hover `shadow-hover` + focus ring (+ optional count badge).
- [ ] Lede: saffron rule accent, `tabular-nums` stats, `text-muted-strong` labels, Devanagari sub-captions, `text-saffron-deep` queue accent, green shield meta, mono "Last update".
- [ ] Footer: tricolor top rule, green check bullets, secondary-button CTAs, mono colophon.

### Batch 5 — Map band (the big one)
Files: `src/components/home/MapBand.tsx`, `src/components/map/MapCanvas.tsx`, `src/components/map/IndiaMap.tsx`
- [ ] Dark-tile frame: section → `bg-ink` band; header/h2/footnote in paper tones; map container gets `shadow-map` + frame border.
- [ ] Overlays → dark glass: event chips, district search, legend, cluster-toggle, `SelectedStory` (with 4px event-hue strip + light-cobalt disclosure).
- [ ] `IndiaMap.tsx` style tweaks: halo radii/opacity, selected two-ring, district fill 0.12 + line 1.6, add `state-hl-line` + `cluster-count` symbol layer, `events-point` stroke 2, use `MAP_TOKENS`.
- [ ] `MapCanvas` loading → India-silhouette shimmer skeleton.
- [ ] Legend: dark glass with per-event hue + count + hint.

### Batch 6 — Data-viz
Files: `src/components/home/TrendCharts.tsx`
- [ ] Sparkline: token stroke/fill gradient, live end-dot pulse, draw-in animation (motion-safe), tick dots, `<title>`.
- [ ] By-state bars: `h-2.5 rounded-full`, gradient fill, mono value labels `text-ink`, `text-inksoft` state names, hover fill.
- [ ] Event-mix: bar height/rounded caps, ghost rows for taxonomy, count labels `text-ink`, optional donut on `lg`.

### Batch 7 — Story cards & desk filing
Files: `src/components/home/StoryFeed.tsx`, `src/components/home/WhyVerified.tsx`
- [ ] StoryFeed: 3px event-hue left strip, `shadow-hover` lift on hover, mono meta `text-muted-strong`, `group-open` detail chevron, optional first-card lead span.
- [ ] WhyVerified: trust-score bar (green/amber/red by thresholds), `tabular-nums`, tone-center, dark variant classes for reuse on the map panel.

### Batch 8 — Citizen modal
Files: `src/components/home/ReportModal.tsx`
- [ ] Saffron header rule, close-button sizing, city chip pills, mono lat/lon with bounds hint, success state `IconCheck` + cobalt receipt tiles, `role="alert"` errors, entrance/motion-reduce.

### Batch 9 — Admin
Files: `src/components/admin/AdminAuthGate.tsx`, `DeskConsole.tsx`, `QueueWire.tsx`, `PromoteModal.tsx`
- [ ] AuthGate: paperdeep tint/watermark, animated entrance, mono password, serif subtitle.
- [ ] DeskConsole: StatsStrip status strips + shimmer skeleton, segmented status pills with counts, admin map legend glass, header polish.
- [ ] QueueWire: selected left-bar + keep ring, mini data chips (conf/trust/corrob bars), green Approve primary, busy spinner, focus-within ring, hover lift.
- [ ] PromoteModal: saffron rule, headline preview + char count, motion-reduce, close sizing.

### Batch 10 — A11y & QA pass
- [ ] Focus audit: every interactive element (map selects, chips, pills, close buttons, summaries) has `:focus-visible`; map wrapper `tabIndex`, no blanket `outline:none`.
- [ ] Contrast sweep against the §5.1 table; swap any missed `text-muted` on `paperdeep`, any `chip` text at base hue.
- [ ] `prefers-reduced-motion` kill-switch verified across all new keyframes.
- [ ] Mock ↔ live sanity: `npm run dev` in mock, `NEXT_PUBLIC_DATA_MODE=live` against co-located backend — visual spec holds in both; no `data.ts`/`types.ts` diffs.

---

## Appendix A — Reference of files consulted (line-level anchors)
| File | Key anchors |
|---|---|
| `tailwind.config.ts` | colors `:7–30`, fonts `:31–35`, shadows `:36–39`, motion `:40–63` |
| `app/globals.css` | `:root` vars `:6–12`, component classes `:28–72`, MapLibre skin `:74–103`, scrollbars `:105–122` |
| `app/layout.tsx` | `:11–14` viewport, `:19–22` body |
| `home/Masthead.tsx` | tricolor `:48–52`, brand `:55–58`, chips/nav `:60–86`, ticker `:88–92`, FAB `:94–100` |
| `home/Lede.tsx` | hero `:39–49`, stats `:51–56`, meta `:58–76` |
| `home/MapBand.tsx` | header `:108–119`, map container `:121`, chips `:134–160`, select `:164–205`, legend `:208–217`, story `:12–67` |
| `home/TrendCharts.tsx` | sparkline `:6–21`, velocity card `:48–59`, bars `:61–105` |
| `home/StoryFeed.tsx` | header `:15–20`, cards `:27–63` |
| `home/WhyVerified.tsx` | rows `:7–17`, box `:29–51` |
| `home/ReportModal.tsx` | overlay/card `:59–66`, receipt `:83–100`, form `:108–166` |
| `home/Footer.tsx` | columns `:6–42`, legal `:44` |
| `admin/AdminAuthGate.tsx` | gate card `:27–50` |
| `admin/DeskConsole.tsx` | stats `:39–71`, filter pills `:196–221`, map column `:245–268` |
| `admin/QueueWire.tsx` | pill/chip `:36–48`, headline `:50–62`, meta `:63–77`, actions `:90–102` |
| `admin/PromoteModal.tsx` | modal `:19–63` |
| `map/IndiaMap.tsx` | STATUS_COLOR `:16–23`, style `:41–171`, filters `:284–321`, wrapper `:323–329` |
| `map/MapCanvas.tsx` | dynamic loader `:6–13` |
| `ui.tsx` | StatusPill `:4–15`, Skeleton `:50–58`, Empty `:60–66` |
| `icons.tsx` | base recipe `:1–15` |
| `lib/eventMeta.ts` | EVENT_META `:12–85`, EVENT_COLOR `:99–101`, STATUS_META `:103–110` |
| `lib/data.ts` | adapter `dataMode` `:20–25` — untouched by this spec |

---

*This document specifies visual design only. No source file outside this document was modified; all prescriptions are applied by a separate implementation pass.*
# Autonomous Agent Implementation Plan — Minimal Prototype, Strong Frontend
**For:** Autonomous coding agents (OpenCode / Claude Code / similar) building this from the finalized architecture
**Scope constraint:** This is an SIH (India) hackathon project — the map, data, and forecasting context must be **India-specific throughout**, not a generic/global weather app.
**Philosophy:** Backend = smallest possible slice that produces *real* data flow. Frontend = fully built out, polished, and detailed, since this is what's seen and judged — and it starts with the agent proposing multiple creative design directions before building anything final.

---

## 0. India-Specific Constraints (apply to every stage below)

These are non-negotiable requirements the agent must bake in from the start, not retrofit later:

| Constraint | Implementation detail |
|---|---|
| **Map bounds** | MapLibre `maxBounds` locked to India's bounding box: approx. `[[68.1, 6.5], [97.4, 35.5]]` (SW to NE lng/lat). Users cannot pan/zoom the map outside Indian territory. |
| **Default view** | Center on India (~22.5°N, 80°E), default zoom level showing the whole country on load, not a world view. |
| **State/district boundaries** | Use accurate India administrative boundary GeoJSON (state + district level) — e.g. from `datameet/maps` or Survey of India-sourced open datasets — for the cascading State→District filter and for drawing boundary overlays. |
| **Political boundary accuracy** | Since this targets a government/SIH audience, boundaries (especially Jammu & Kashmir, Ladakh, and disputed border regions) must follow the **Survey of India's official external boundary depiction**. Do not use a default Mapbox/OSM boundary layer without checking this — flag this explicitly to the agent as a review item, not an assumption. |
| **Units & locale** | Temperature in °C, rainfall in mm, wind speed in km/h, all timestamps displayed in **IST (UTC+5:30)**, dates in DD/MM/YYYY format. |
| **Event types** | Scoped to weather events actually relevant to India's climate: Flooding, Heatwave, Cold Wave, Cyclone, Thunderstorm/Hailstorm, Dust Storm, Fog/Smog, Landslide (monsoon-triggered), Drought — not generic categories like "Snowstorm" or "Hurricane" (US terminology). |
| **Ground-truth source framing** | IMD (India Meteorological Department) is the primary authority referenced in the UI copy — trust-score corroboration language should say "cross-checked against IMD data," not a generic "official sensor." |
| **Sample/mock data** | All mock reports (`mockData.ts`, `sample_posts.json`) must use real Indian city/state names, realistic Indian monsoon-season scenarios (e.g., Mumbai flooding, Chennai cyclone, Delhi heatwave/AQI, Assam floods, Rajasthan dust storms) — not placeholder "City A, Country B" data. |
| **Basemap style** | Choose or style a basemap that renders Indian state/district labels legibly at country-zoom level (many default MapLibre demo styles are optimized for US/Europe label density). |

---

## 1. Repo Structure

```
weather-platform/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── db.py
│   │   ├── models.py
│   │   ├── routes/
│   │   │   ├── ingest.py
│   │   │   ├── public.py
│   │   │   └── admin.py
│   │   ├── pipeline/
│   │   │   ├── trust_score.py
│   │   │   ├── dedup.py
│   │   │   └── classify.py
│   │   └── stream_simulator.py
│   ├── data/
│   │   ├── sample_posts.json        # Indian cities/states, realistic monsoon-season scenarios
│   │   └── india_boundaries.geojson # state + district boundary data
│   ├── requirements.txt
├── docker-compose.yml               # singular root compose — launches everything
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── admin/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── map/                     # India-bounded MapLibre wrapper, pin layers, popups
│   │   ├── filters/                 # date/event/State→District filter panel
│   │   ├── charts/
│   │   ├── triage/
│   │   └── ui/
│   ├── lib/
│   │   ├── store.ts
│   │   ├── mockData.ts              # Indian-city GeoJSON fixtures
│   │   └── api.ts
│   ├── public/
│   └── package.json
└── README.md
```

---

## 2. Backend — EXTREME MINIMAL SCOPE

**Deferred (documented, not forgotten):**
- ❌ Kafka, ❌ Celery, ❌ PySpark batch layer, ❌ P2/optional AI models (language ID, PageRank, drift monitoring, LangGraph, translation), ❌ real JWT/RBAC (use a hardcoded admin token env var)

**Kept — the minimal real slice:**

| Component | Minimal implementation |
|---|---|
| DB | PostgreSQL + PostGIS, single `reports` table (id, text, lat, lon, event_type, state, district, trust_score, status enum, media_url, created_at) |
| Ingest endpoint | `POST /api/v1/report` — insert row, run pipeline inline, publish to Redis Pub/Sub |
| Trust score | Rule-based: corroboration count within 500m/10min via `ST_DWithin`, weighted with text heuristics |
| Event classification | HuggingFace zero-shot (`mDeBERTa-v3-base-mnli-xnli`), labels restricted to the India-specific event-type list above |
| Location resolution | Reverse-geocode via Nominatim → map to nearest India state/district using `india_boundaries.geojson`, not just a raw lat/lon |
| Dedup | `imagehash` pHash comparison against last N reports in Redis |
| Verification state machine | AUTO_VERIFIED / AI_FLAGGED / AUTO_REJECTED, exactly as specified in the finalized doc |
| Stream simulator | Replays `sample_posts.json` (Indian scenarios) every ~1–3 sec |
| WebSocket | `/ws/live-map` — broadcasts new verified reports as GeoJSON |
| Public API | `GET /api/v1/public/clusters` — GeoJSON FeatureCollection, verified reports only |
| Admin API | `GET /api/v1/admin/queue` + `PATCH /api/v1/admin/queue/{id}` |

**Acceptance criteria:**
1. `docker-compose up` — zero manual steps
2. Stream simulator produces new rows within seconds, all geographically inside India's bounding box
3. `GET /api/v1/public/clusters` returns valid GeoJSON, all coordinates within Indian territory
4. Duplicate detection correctly flags near-identical text/location reports
5. WebSocket delivers a message on new auto-verified reports

---

## 3. Frontend — Step Zero: Design Architecture Proposals

**Before writing any final frontend code**, the agent must produce **3–4 distinct, creative design direction concepts** for the dashboard and present them for selection. Each proposal should include:

- A short name and one-paragraph creative concept/mood
- Primary color palette + typography direction
- Layout philosophy (e.g., map-dominant vs. split-panel vs. data-dense grid)
- How it handles the specific challenge of "India-bounded live disaster map + admin triage" differently from the others
- A rough wireframe description or ASCII/ANSI sketch of the main map view

**Suggested creative directions to explore (agent should riff on these, not just fill them in literally):**
1. **National Command Center** — dark ops-room aesthetic, inspired by ISRO/NDMA control rooms, high information density, monospace data readouts, alert-siren color accents (amber/red) for severity
2. **Government Digital India Portal** — clean, accessible, tricolor-inspired accent palette used tastefully (not literally flag colors), Devanagari-friendly typography choices, high-contrast for public accessibility standards
3. **Monsoon Data Studio** — editorial/data-journalism inspired (think a polished data-viz publication), generous whitespace, large typographic numbers for stats, map as one element among rich charts rather than the sole focus
4. **Real-Time Ops Grid** — modular card/tile-based dashboard (like a NOC/SOC monitoring wall), everything reflows into resizable panels, built for a multi-monitor "war room" display during an actual disaster response

The agent should **not** pick one automatically — present all proposals clearly (e.g., as labeled mockup descriptions, or actual rendered static comps if capable) and wait for a decision before proceeding to the full build in Section 4.

**Decision (2026-08-30):** Option selected = a creative integration of **Digital India Portal** and **Monsoon Data Studio** — product identity "**JanMausam — The People's Weather Desk (जनमौसम)**": the bright, high-contrast, accessible public-service framework of the Portal (cobalt primary, tricolor masthead rule kept restrained, Devanagari-capable fonts, "Why was this verified?" transparency) married to the Studio's editorial structure (serif masthead + lede, full-bleed cinematic India map band as the centerpiece spread, trend charts, newsroom-wire triage desk with promote/headline flow). Public view is story-structured; admin view is a bilingual "Desk Console".

---

## 4. Frontend — Full Build (after a design direction is chosen)

### 4a. Public Map View (`/`)
- Full-bleed MapLibre GL JS map, **hard-locked to India's bounding box** (see Section 0), default centered/zoomed to show the full country
- India state/district boundary overlay (togglable), sourced from `india_boundaries.geojson`
- Clustered pins (only `VERIFIED`/`AUTO_VERIFIED` shown publicly), color-coded by event type using the India-specific event list
- Pin popup: event type + icon, excerpt, IST-formatted relative time, trust score, media thumbnail
- Filter panel: time window (1h/6h/24h + custom), event-type pills (India-specific list), **State → District** cascading dropdown driven by real Indian administrative data, bounding-box draw filter
- Live velocity sparkline chart, updates via WebSocket
- ISRO/Bhuvan satellite layer toggle
- New-pin arrival animation on WebSocket push
- Empty/loading states, fully responsive (mobile bottom-sheet filter panel)

### 4b. Admin Triage View (`/admin`)
- Split-screen: Kanban triage queue (left) + full-status map (right), same India-bounded map instance
- Cards show trust-score gauge, corroboration count vs. IMD ground truth, "why flagged" reason, media thumbnail
- Approve/Reject with optimistic UI, map fly-to on card select
- Simple token-based admin login screen
- Stats header: today's totals, verification breakdown, queue depth
- "Run Big Data Aggregation" button (wired to the plain SQL aggregate query in minimal-backend mode)

### 4c. Analytics Panel
- Reports per Indian state/district (bar chart)
- Ingestion velocity over time (line chart)
- Verification status breakdown (donut)
- Built against `mockData.ts` first, swapped to a real `/api/v1/admin/stats` endpoint later

### 4d. Shared UI polish
- Consistent design system (Button, Badge, Card, Skeleton, Toast) matching whichever design direction was chosen in Section 3
- Toasts for actions and connection state
- Loading skeletons, not spinners
- Consistent icon set for the India-specific event types

**Acceptance criteria:**
1. Runs fully on `mockData.ts` (Indian-city fixtures) with zero backend running
2. Map never allows panning/zooming outside India's territory
3. Swapping to live API/WebSocket data requires no component changes
4. All views responsive on desktop and mobile
5. WebSocket reconnect handled gracefully

---

## 5. Execution Order for the Agent(s)

1. Scaffold repo structure + `docker-compose.yml`
2. Backend: DB schema, ingest endpoint, trust score, dedup, verification state machine, India state/district resolution — verify end-to-end via `curl` first
3. Backend: stream simulator (Indian scenarios) + WebSocket + public/admin GET endpoints
4. **Frontend: produce the 3–4 design architecture proposals (Section 3) and stop for user selection** — this happens before any final UI code is written
5. Frontend: build the full public map + admin view in the chosen design direction, against `mockData.ts` (Indian fixtures) first
6. Frontend: polish pass — animations, empty/loading states, responsive behavior
7. Integration: swap frontend from mock to live data, verify all acceptance criteria
8. If time remains: reintroduce Kafka/Celery/PySpark as additive layers — no existing component needs to change

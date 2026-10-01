# JanMausam — India Weather Big Data Platform (SIH-2026 demo)

The People's Weather Desk (जनमौसम). A minimal real data pipeline + a fully built,
editorially polished frontend for a judgeable smart-India demo.

```
citizens/sensors ─► report ─► [bounds check] ─► [dedup] ─► [state/district resolve]
                                        ─► [event classify] ─► [trust score] ─► [verify]
                                          │                                │
                                          ▼                                ▼
                                  admin queue  ◄── desk verdicts          publish
```

## What's real (backend)

- **Postgres + PostGIS 16** (`reports` table with geography column)
- **Redis** — text-similarity + pHash dedup ring buffer, corroboration stamps
- **FastAPI** — pipeline: India-bounds guard → deduplication → reverse-geocode to
  state/district → event classification (India taxonomy) → corroboration-based
  trust score → verification state machine (`pending / auto_verified /
  ai_flagged / auto_rejected / verified / rejected`)
- **Trust score**: `0.55 × corr_factor + 0.45 × conf`, corroboration = same-event
  reports within **500 m / ±10 min** (geography cast); auto-verify ≥ 0.66, AI-flag ≥ 0.35
- **GeoJSON admin boundaries**: 36 states + 726 districts (Census-2011 delineation)
- **Strict India bounds**: `[[68.1, 6.5], [97.4, 35.5]]` — out-of-bounds rejected (422)
- **WebSockets**: `live-map` (new verified reports) and `admin-events` (verdicts)

## What's frontend

Next.js + TypeScript + Tailwind + MapLibre GL. **Mode is mock-first**, so it runs
offline; flip `NEXT_PUBLIC_DATA_MODE=live` to consume the real backend through a
Next.js server proxy (`/api/backend/*`, admin token held server-side).

- `/` — editorial public desk: masthead, lede, **India-bounded live map** (pin
  clustering, event-type filters, state/district tracking), velocity / by-state /
  event-mix charts, verified "wires" with `Why verified?` desk filings
- `/admin` — **Desk Console** (संपादन कक्ष): token-gated triage queue with
  approve / reject / promote-to-headline, all-statuses admin map, live stats

## Run the full stack (one command, from the repo root)

```bash
docker compose up -d --build
```

This single root `docker-compose.yml` launches **everything** — Postgres/PostGIS,
Redis, the FastAPI pipeline, the stream simulator, and the Next.js web app:

| Service    | Port  | Purpose                                    |
|------------|-------|--------------------------------------------|
| api        | internal | ingest, trust-scoring, triage, publishing |
| web        | 3000 (configurable) | JanMausam public desk + Desk Console (live) |
| simulator  | —     | replays 115 Indian reports, endless feed   |
| db / redis | internal | PostGIS store, dedup + pub/sub             |

Public UI: http://localhost:3000 · Desk: http://localhost:3000/admin

The API, database, and Redis ports are intentionally private to the Compose
network. The browser uses the Next.js server proxy, so only the web port needs
to be allowed through a host firewall or cloud security group.

## Deploy on AWS EC2 with an Elastic IP

1. Install Docker Compose on the EC2 instance and clone this repository.
2. Allow inbound TCP `80` in the instance security group (and the local
  firewall, if enabled). Do not open `5432` or `6379` publicly.
3. Start the stack on port 80:

```bash
WEB_PORT=80 docker compose up -d --build
```

Then open `http://<elastic-ip>/` and `http://<elastic-ip>/admin`. Set a private
admin token before starting the stack when this is more than a disposable demo:

```bash
export WEATHER_ADMIN_TOKEN='replace-with-a-long-random-value'
WEB_PORT=80 docker compose up -d --build
```

For local development, omit `WEB_PORT` and use port 3000 as shown above.

The web app runs in **live mode** against the co-located backend; the simulator
resets its dedup canvas per pass so a live demo keeps producing verified pins.

## Run the frontend locally (mock or live)

```bash
cd frontend
npm install
npm run dev                 # mock data, fully offline
# live mode:
set NEXT_PUBLIC_DATA_MODE=live
set BACKEND_BASE_URL=http://localhost:8000
npm run dev
```

## Boundaries note

Map boundaries use the Census-2011 delineation under the current 36-state
structure; official depiction is subject to survey review by the Government of
India. IMD remains the authoritative weather source.
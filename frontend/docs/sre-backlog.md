# JanMausam — SRE Improvement Backlog

Priorities: **P0 = before demo day**, **P1 = before scale demo**, **P2 = nice-to-have**.
Effort × Impact: S/M/L.

## P0 — before demo day (some already shipped this session)

| # | Item | Status | Effort × Impact |
|---|------|--------|-----------------|
| 1 | `api` container healthcheck (`python urllib` → `/healthz`) + `web`/`simulator` wait on `service_healthy` | ✅ DONE in `docker-compose.yml` | S × H |
| 2 | `restart: unless-stopped` on **all** services (db, redis, api missing before) | ✅ DONE | S × H |
| 3 | Log rotation cap — json-file `max-size: 10m, max-file: 3` on every service (simulator runs forever) | ✅ DONE | S × M |
| 4 | Cache headers for `/public/data/*.geojson` (`next.config.ts`, `max-age=3600`) | ✅ DONE in file — **activates on next `web` rebuild** | S × M |
| 5 | Full CLEAN-DEMO drill (`down -v && up -d --build`) on a quiet machine, timed from cold | ⏳ Run before event (deferred here to avoid clobbering frontend agent's live smoke-test) | M × H |
| 6 | Pre-pull base images / pre-build on the event machine; consider `docker save` tarball | ⏳ Event-day prep | S × H |

## P1 — before scale / next sprint

| # | Item | Effort × Impact |
|---|------|-----------------|
| 1 | **Backend Redis TTL cache for `GET /api/v1/public/clusters`** (10–30 s). Route currently queries Postgres per poll (verified). Ownership: backend Python (out of SRE scope) — hand to backend author. | S × H at >5k pins |
| 2 | **Backend pip layer caching** — backend image is 610 MB and `pip install` runs fresh every build. Add BuildKit cache mount in `backend/Dockerfile`: `RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt` (or a warm pip-cache stage). Saves minutes per rebuild. | S × M |
| 3 | **Healthcheck for `web`** — `CMD ["node","-e","fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1))"]`; gives `docker compose ps` full green and lets dependents wait on the UI. | S × M |
| 4 | **Resource limits** — `mem_limit`/`cpus` per service in compose (e.g. db 1 GB, api 512 MB, web 1 GB, simulator 256 MB) to stop one runaway service starving the laptop. | S × M |
| 5 | **Bounded growth** — simulator currently inserts +115 rows every ~4 min forever (dedup reset). Either cap DB age (`DELETE` old rows in a maintenance loop) or allow `down -v` as the only reset. Demo-acceptable; flag for scale. | M × M |

## P2 — nice-to-have

| # | Item | Effort × Impact |
|---|------|-----------------|
| 1 | Compose **demo profile** — e.g. `simulator` gains `profiles: ["live"]` so `docker compose up -d` alone runs a quiet stack for debugging, `docker compose --profile live up -d` runs the full feed. DO NOT change default behavior before demo day. | S × M |
| 2 | Image hygiene — `web` 866 MB / `api` 610 MB / `db` 627 MB ≈ 2.2 GB of images. `docker system df`, prune stale build cache, or slim base (python slim with `uv` layer, frontend standalone output — explicitly out of scope per charter) as a stretch. Frontend `node:22-alpine` multi-stage itself is fine (per charter). | M × M |
| 3 | Backend image split — `api` and `simulator` currently build the same image twice (two images ~610 MB each). Let `simulator` reuse `api`'s image (`image: janmausam-api` + command override) to halve disk + build time. | S × M |
| 4 | Structured logs / JSON formatter for api (uvicorn access logs currently plain) — grep-able debugging. | S × L-ish (time) |
| 5 | Metrics endpoint (Prometheus `/metrics`) + SLO burn-rate dashboards — overkill for demo, right for production path. | L × L |
| 6 | Fault-injection mode for chaos drills (`SIM_FAULT_RATE` env knob to drop/duplicate posts). | M × L |

## Suggested next 3 actions (ordered)

1. Backend author adds Redis TTL on `/public/clusters` (P1-1).
2. Rerun web build to activate geojson cache headers; verify
   `curl -sI localhost:3000/data/india-states.geojson | findstr Cache` shows `max-age=3600`.
3. Event-day: pre-pull images + full CLEAN-DEMO drill timing on the actual laptop.
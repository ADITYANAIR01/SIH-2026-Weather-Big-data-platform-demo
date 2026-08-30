# JanMausam — Ops Runbook (SRE)

> Single source of truth for operating the JanMausam demo stack (SIH-2026).
> Location decision: ALL ops docs live in `frontend/docs/` —
> `ops-runbook.md`, `performance-notes.md`, `demo-run-script.md`, `sre-backlog.md`.

## Topology

| Service    | Image                                     | Port    | Healthcheck                                  | Restart            | Log cap      |
|------------|-------------------------------------------|---------|----------------------------------------------|--------------------|--------------|
| `db`       | postgis/postgis:16-3.4-alpine             | 5432    | `pg_isready -U weather -d weather`           | unless-stopped     | 10 MB × 3    |
| `redis`    | redis:7-alpine                            | — (int) | `redis-cli ping`                             | unless-stopped     | 10 MB × 3    |
| `api`      | local `backend/` build                    | 8000    | python urllib → `GET /healthz` (5s, 20 retries, 10s start) | unless-stopped | 10 MB × 3 |
| `simulator`| local `backend/` build (same image)       | — (int) | none (watched by api health)                 | unless-stopped     | 10 MB × 3    |
| `web`      | local `frontend/` build (`next start`)    | 3000    | none (depends on api *healthy*)              | unless-stopped     | 10 MB × 3    |

Startup order is enforced by `depends_on: condition: service_healthy`:
`db` → (`redis` → `api`) → (`simulator` + `web`). The web Next.js proxy and the
simulator never race an API that isn't up.

**Admin desk token (also used by web env and simulator):**
`sih2026-demo-admin-token`

**Compose project name:** `janmausam` → containers are named `janmausam-<svc>-1`.

## Commands (run from repo root)

```powershell
# Start everything (build if images missing)
docker compose up -d --build

# Stop / start / restart a single service (keeps volumes)
docker compose restart web
docker compose start api
docker compose stop simulator

# Logs (follow)
docker compose logs -f web
docker compose logs -f api
docker compose logs -f simulator
docker compose logs --tail=100 api

# Rebuild ONLY the frontend after frontend code changes
docker compose up -d --build web

# Rebuild ONLY the backend (api + simulator share the image)
docker compose up -d --build api

# Full clean state (WIPES the Postgres volume — safe, simulator re-seeds)
docker compose down -v
docker compose up -d --build
```

## Health verification (post-start)

```powershell
docker compose ps          # expect db/redis/api "healthy", web+simulator "Up"
curl.exe -s http://localhost:8000/healthz        # expect {"status":"ok"}
curl.exe -s -H "x-admin-token: sih2026-demo-admin-token" `
  http://localhost:8000/api/v1/admin/stats      # expect counts
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/   # expect 200
docker compose logs --tail=20 simulator          # expect "201 auto_verified" lines
```

## CLEAN-DEMO procedure (before a judge session)

```powershell
docker compose down -v        # deletes pgdata volume → empty canvas
docker compose up -d --build  # fresh DB; simulator re-seeds from backend/data/sample_posts.json
```

The simulator replays the 115 real monsoon reports in a loop (1–3 s apart,
~4 min per pass) and calls `DELETE /api/v1/admin/reset-dedup` at the start of
every pass, so each pass re-adds reports as **new rows**. After clean start:

- ~5–15 s: first pins appear on the public map (growing canvas).
- ~2–3 min: ~80–100 verified pins on screen — ideal for the 3-min demo.
- ~30 min: ~650–850 pins, clusters payload still ≈ 300 KB.

## Common fixes

| Symptom | Fix |
|---|---|
| Web shows "backend unreachable" / ErrorState | api was mid-restart — hit the Retry button; or `docker compose restart api` |
| Map empty although api OK | Simulator crashed — `docker compose logs simulator`, then `docker compose restart simulator` (re-seeds automatically) |
| Stale/crowded demo canvas | Run CLEAN-DEMO (`down -v && up --build`) |
| Port 3000 busy on judge machine | `docker compose stop` the other app, or map web to another host port in compose |
| Logs filling disk over hours | Already capped at 10 MB × 3 per service (json-file driver) |

## Known limits (by design)

- DB grows unboundedly while the simulator runs (+115 rows every ~4 min);
  CLEAN-DEMO resets it. Fine for demo/sprint; not a production design.
- `/api/v1/public/clusters` is **not cached** in Redis (hits Postgres per poll) —
  ~45–80 ms at 1,000+ rows, fine for demo. Backlog P1: add Redis TTL cache.
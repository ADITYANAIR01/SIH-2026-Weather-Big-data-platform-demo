# JanMausam — Performance Notes (SRE)

Measurements taken 2026-08-30 against the live stack (`docker compose ps`: 5/5 up,
api+db+redis healthy, ~839 verified reports in DB at measure time).

## 1. Static map boundary files (`/public/data/*.geojson`)

| File                 | Size (disk) | Served bytes | Headers before    |
|----------------------|-------------|--------------|-------------------|
| `india-states.geojson`    | 213.7 KB | 218,798 (218.8 KB) | `Cache-Control: public, max-age=0` + ETag |
| `india-districts.geojson` | 961.9 KB | 984,981 (984.9 KB) | `Cache-Control: public, max-age=0` + ETag |

These are build-time assets and never change at runtime, yet Next default-served
them with `max-age=0`, i.e. the browser revalidated both files on **every** page
load (two extra round-trips + 304s).

**Change made (SRE, strictly caching):** `frontend/next.config.ts` sets
`Cache-Control: public, max-age=3600` for `/data/:path*`. Takes effect on the
next web build (`docker compose up -d --build web`). ETag remains, so a
regenerated geojson is picked up after ≤1 h.
Estimated saving: ~2.4 MB of revalidation traffic per fresh page load + two
round-trips of latency per map mount.

## 2. Live clusters feed (`GET /api/v1/public/clusters`)

| Query | Payload (uncompressed) | Server time |
|---|---|---|
| No filter (since_minutes=1440 default, ~839 verified) | 301,236 B (301 KB) | 45–50 ms |
| Via Next proxy (`:3000/api/backend/…`) — what the browser actually calls | 373,874 B (374 KB) | 65 ms |
| bbox Maharashtra only | 53,373 B (53 KB) | 79 ms |

- Frontend poll cadence: **15 s public / 5 s admin** → ≈ 25 KB/s (public) on
  localhost. Negligible.
- Backend does a fresh Postgres query per poll — **no Redis cache** on this
  route today (verified in `backend/app/routes/public.py`; limit 2000 features).
  At demo scale it's fine: 45–80 ms and the DB is tiny. At >5–10k rows or scale,
  add a Redis TTL (see backlog P1).

**Verdict: 700-pin fetching is absolutely fine for a live demo.** Justification:
374 KB per 15 s poll = ~1.5 MB/min over loopback with <80 ms server time; map
clustered rendering (maplibre) handles this easily on a mid-range laptop.

## 3. Next.js bundle sizes (`next start`, live mode build)

First-load JS measured by parsing served HTML and fetching each script:

| Page | First-load JS | Scripts |
|---|---|---|
| `/` (public) | **534.7 KB** (8 scripts) | largest `517-…` = 200.5 KB |
| `/admin` | **520.8 KB** (8 scripts) | `app/admin/page` = 13.7 KB |

Plus one **dynamic** chunk pulled when the map mounts
(`react-loadable-manifest.json` → `MapCanvas.tsx → ./IndiaMap`):
`05f6971a….js` = **1,036,133 B (1.01 MB)** + `467…` 5.4 KB + a css chunk.

Worst-case full map paint = ~535 KB initial JS + ~1.04 MB map chunk +
~1.18 MB geojson ≈ **2.75 MB** over loopback ≈ well under a second. Fine.

Notes:
- Perf budget is dominated by `maplibre-gl` (the 1.04 MB dynamic chunk). It is
  already lazily loaded only when a map mounts, so the homepage shell renders
  fast. Bigger wins (data-driven only) would come from trimming maplibre or
  switching the districts layer off on the public page — not worth it pre-demo.
- `.next` total in image: 57.2 MB. Frontend runner image: 866 MB
  (node:22-alpine + full `node_modules` prod deps — acceptable for demo; a
  standalone/traced output would be a P2 lean-down, explicitly out of scope per
  charter).

## 4. Data-growth model (from simulator code + observed stats)

- 115 sample posts replay in a loop; dedup ring (`dedup:recent` in Redis) is
  cleared each pass → each pass inserts **new** rows.
- Observed: +879 rows in 29 min (≈ 30 rows/min), ~655 verified then.
- Clusters returns up to 2000 newest verified features → payload grows slowly
  (~≈ 100 KB per 700 extra pins). At demo-day scale (fresh DB) nothing to worry
  about; hours-long runs grow the DB without bound (see runbook known-limits).

## Easy wins (summary)

1. **[DONE] geojson cache headers** — `next.config.ts` `max-age=3600` (activates on next web build).
2. **[P1, backend-owned] Redis TTL cache on `/public/clusters`** (e.g. 10–30 s) — cuts Postgres load to 1 query per TTL window; payload size unchanged.
3. **[P2] Tree-shake maplibre** or import only `maplibre-gl` entry needed — the 1 MB dynamic chunk is the single biggest transfer on map mount.
4. **[P2] Lazy-load districts geojson** on public page until zoom > threshold (frontend/app-owned — defer to Senior Developer).
# JanMausam — 3-Minute Demo Run Script (SRE)

**Objective:** one operator, one laptop, zero drama. The canvas grows live in
front of the judges because we ran the CLEAN-DEMO procedure right before.

## Before the judges walk in (T−10 min)

1. Run the CLEAN-DEMO procedure **once**:
   ```powershell
   docker compose down -v
   docker compose up -d --build
   ```
2. Verify health (30 s):
   ```powershell
   docker compose ps                       # all 5 up, db/redis/api healthy
   curl.exe -s http://localhost:8000/healthz
   ```
3. Open **two browser tabs** (let both load):
   - Tab 1 → `http://localhost:3000/` (public page)
   - Tab 2 → `http://localhost:3000/admin` (admin desk)
   - At T−10 → T−7 the public map shows only a handful of pins. Do NOT reload at
     T−1; let the count grow live for the judges.
4. Keep this window open for fallback:
   ```powershell
   docker compose logs -f api
   ```
5. Keep the desk token at hand (already baked into the web proxy; only needed
   if logging in manually): `sih2026-demo-admin-token`

## The 3-minute walkthrough (minute by minute)

| Time | What the operator does | What the judges see |
|------|------------------------|---------------------|
| 0:00 | Show Tab 1 (public map). Point at the **growing pin count** and today's verified number. | ~60–100 pins scattered across India; new pins appear every few seconds. |
| 0:30 | Zoom into one region (e.g. Maharashtra floods, Assam rain). State "every pin is a verified citizen report with coordinates". | Clustered pins expand on zoom; boundary layers (states/districts) render instantly from cached geojson. |
| 1:00 | Flip to **Tab 2 (admin desk)** — same browser window, second tab. | Queue wire with pending/flagged reports; verify one or two manually (Approve). |
| 1:30 | Hit the "Run Big Data Aggregation" button (or equivalent stats action) — show the state chart + hourly velocity. | Aggregated stats re-render instantly (`/api/v1/admin/stats`). |
| 2:00 | Flip **back to Tab 1 (public map)**. The manually-approved report should now be visible as verified, plus the canvas kept growing. | End-to-end loop closed: ingest → trust pipeline → admin action → public map. |
| 2:30 | Open the huddle question: "This is a demo of the big-data plumbing — 115 sources replayed over PostGIS + Redis + FastAPI, ~30 rows/min". Mention SLO framing if asked. | Live pins still accumulating. |
| 3:00 | End on a **freeze frame** of the public map with a nice count. | Done. |

## Fallbacks (in order)

| If… | Do | Impact |
|-----|----|--------|
| Web shows ErrorState "backend unreachable" | Click **Retry**, or `docker compose restart api` (≈10 s). ErrorState+Retry is by design. | Map freezes up to 10 s; data resumes. |
| Map pins stop growing | `docker compose logs simulator`; `docker compose restart simulator` (auto re-seeds). | ~15 s gap, then new pins. |
| A tab is blank/stale | Hard refresh the tab (Ctrl+F5). | Instant. |
| First map paint slow (>2 s) | Pre-warmed by step 3; on the day click the map once early so the 1 MB map chunk is cached. | — |
| Absolutely no pins after 60 s | Check `docker compose ps`; if api not healthy, `docker compose up -d`; if simulator not started, `docker compose start simulator`. | Under 60 s to flowing data. |

## Top 5 reliability risks (live event) — with mitigations

1. **Internet required for cold build/images.**
   `postgis` (627 MB), `redis`, `node:22-alpine`, `python:3.12-slim` are pulled
   at first build. On a judge-site network without internet, `up -d --build`
   dies. → **Build + pull everything before event day**; keep Docker Desktop
   running; ship a `docker save`/`load` tarball of the 5 images as the last-ditch
   fallback.
2. **Backend wedges mid-demo.** API crash / DB lock during the exact minute you
   need it. → api now has a healthcheck + `restart: unless-stopped`; the web
   proxy surfaces ErrorState+Retry; operator fallback is `docker compose restart api`.
3. **Stale or cluttered canvas.** Forgetting CLEAN-DEMO means judges see an
   hour-old dense map instead of a growing one. → Run CLEAN-DEMO at T−10; spend
   30 s verifying counts.
4. **Port conflicts (3000/8000/5432) on the judge machine.** → Pre-flight
   `docker compose ps`; if a port is taken, yank it via compose port mapping
   before the demo (runbook "Common fixes").
5. **Host resource exhaustion in long sessions.** Docker Desktop on a 8 GB RAM
   laptop + eternally-running simulator + log growth. → Logs capped at 10 MB × 3;
   clean-demo right before keeps the working set small; restart simulator between
   sessions if needed.

## Success criteria (SRE definition of done)

- `docker compose ps` 5/5, db/redis/api healthy.
- `/healthz` = ok; admin stats show `today_verified > 0` and rising.
- Public map shows pins that **increase** between 0:00 and 3:00.
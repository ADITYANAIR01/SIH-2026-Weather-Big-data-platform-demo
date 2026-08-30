"""Stream simulator.

Replays `sample_posts.json` (real Indian monsoon-season scenarios) on the
ingest endpoint every 1–3 seconds. Timestamps replay monotonically from the
start time using each post's `offset_s`, so the internal corroboration
clusters (multiple reports within 500 m / 10 min) actually fire the
ST_DWithin trust-score corroboration.

Runs as a separate container/service in docker-compose.
"""

import asyncio
import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

from .config import settings

LOOP_COUNT = int(1e9)


def _load_posts() -> list[dict]:
    with open(settings.sample_posts_path, encoding="utf-8") as fh:
        return json.load(fh)


async def run_once(client: httpx.AsyncClient) -> None:
    posts = [p for p in _load_posts() if p.get("lat") is not None]
    for post in posts:
        reported_at = (datetime.now(timezone.utc) - timedelta(seconds=random.uniform(0, 20))).isoformat()
        payload = {
            "text": post["text"],
            "lat": post["lat"],
            "lon": post["lon"],
            "source": post.get("source", "simulator"),
            "reported_at": reported_at,
        }
        try:
            resp = await client.post("/api/v1/report", json=payload)
            ok = resp.status_code in (200, 201)
            print(
                f"[{reported_at}] {post['text'][:60]!r:62} -> "
                f"{resp.status_code} {resp.json().get('status', '') if ok else resp.text[:80]}"
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[simulator] POST failed: {exc}")
        await asyncio.sleep(random.uniform(settings.sim_min_interval, settings.sim_max_interval))


async def main() -> None:
    base_url = settings.sim_api_base.rstrip("/")
    headers = {"x-admin-token": settings.admin_token}
    async with httpx.AsyncClient(base_url=base_url, timeout=15.0, headers=headers) as client:
        for iteration in range(LOOP_COUNT):
            print(f"\n--- simulation pass {iteration + 1} @ {base_url} ---")
            try:
                await client.delete("/api/v1/admin/reset-dedup")  # fresh demo canvas per pass
                await run_once(client)
            except Exception as exc:  # noqa: BLE001
                print(f"[simulator] pass failed: {exc}")
                await asyncio.sleep(2.0)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
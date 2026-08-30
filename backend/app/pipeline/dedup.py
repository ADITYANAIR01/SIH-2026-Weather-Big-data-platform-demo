"""Duplicate detection.

Two complementary signals:
  1. Text similarity: near-identical text within a small geographic ring
     (SequenceMatcher ratio > 0.85 and within 1.5 km of a recent report).
  2. Media pHash: perceptual-hash distance of images (if media_url is present),
     compared against hashes stored for the last N reports.

State lives in Redis so the hot path is trivial and restart-safe. Media hashing
is best-effort: if the image cannot be fetched in time, the text signal alone
decides.
"""

import asyncio
import json as _json
from difflib import SequenceMatcher

import httpx
from PIL import Image, UnidentifiedImageError

from ..models import utcnow

REDIS_KEY = "dedup:recent"
MAX_RECENT = 120  # windows we keep for comparison
TEXT_SIM_THRESHOLD = 0.85
GEO_METERS = 1500.0
PHASH_DISTANCE = 10
IMAGE_FETCH_TIMEOUT = 2.5


def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    from math import asin, cos, radians, sin, sqrt

    r = 6371000.0
    p1, p2 = radians(lat1), radians(lat2)
    dp = radians(lat2 - lat1)
    dl = radians(lon2 - lon1)
    a = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return 2 * r * asin(sqrt(a))


def _normalise_text(text: str) -> str:
    return " ".join((text or "").lower().split())


async def _phash_of_url(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=IMAGE_FETCH_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        import io

        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        return str(__import__("imagehash").phash(img))
    except (httpx.HTTPError, UnidentifiedImageError, OSError, ValueError):
        return None


class DuplicateDetector:
    def __init__(self, redis):
        self.redis = redis

    async def is_duplicate(self, text: str, lat: float, lon: float, media_url: str | None) -> tuple[bool, str]:
        norm = _normalise_text(text)
        if not norm:
            return True, "empty_text"

        async with self.redis.pipeline(transaction=False) as pipe:
            await pipe.lrange(REDIS_KEY, 0, MAX_RECENT)
            results = await pipe.execute()
        items_raw = results[0] if results else []
        items = [_json.loads(s) for s in (items_raw or [])]

        # 1) text similarity within geographic proximity
        for item in items:
            if _haversine_m(lat, lon, item["lat"], item["lon"]) <= GEO_METERS:
                ratio = SequenceMatcher(None, norm, item["text"]).ratio()
                if ratio >= TEXT_SIM_THRESHOLD:
                    return True, f"near-identical text (similarity {ratio:.0%}) within 1.5 km"

        # 2) media perceptual hash
        if media_url:
            new_hash = await _phash_of_url(media_url)
            if new_hash:
                for item in items:
                    if item.get("phash") and _hamming(item["phash"], new_hash) <= PHASH_DISTANCE:
                        return True, "same media (pixel-hash match)"
        return False, ""

    async def record(self, report_id: str, text: str, lat: float, lon: float, media_url: str | None) -> None:
        item = {
            "id": report_id,
            "text": _normalise_text(text),
            "lat": lat,
            "lon": lon,
            "ts": utcnow().isoformat(),
        }
        if media_url:
            ph = await _phash_of_url(media_url)
            item["phash"] = ph
        payload = _json.dumps(item)
        async with self.redis.pipeline(transaction=False) as pipe:
            await pipe.lpush(REDIS_KEY, payload)
            await pipe.ltrim(REDIS_KEY, 0, MAX_RECENT)
            await pipe.execute()


def _hamming(a: str, b: str) -> int:
    return sum(1 for ca, cb in zip(a, b) if ca != cb) + abs(len(a) - len(b))
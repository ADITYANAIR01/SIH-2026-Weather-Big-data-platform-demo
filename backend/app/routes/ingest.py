"""POST /api/v1/report — the single ingest entry point.

Inline pipeline: bounds check → dedup → geocode (state/district) → classify →
trust score (corroboration + heuristics) → verification state machine →
publish to Redis Pub/Sub if auto-verified.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2 import WKTElement
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session, redis_client
from ..geo import in_india_bounds, resolve
from ..models import Report, ReportStatus
from ..pipeline.classify import classify
from ..pipeline.dedup import DuplicateDetector
from ..pipeline.trust_score import compute_trust

router = APIRouter(prefix="/api/v1", tags=["ingest"])

LIVE_MAP_CHANNEL = "live-map"
AUTO_VERIFY_THRESHOLD = 0.66
AI_FLAG_THRESHOLD = 0.35


class IncomingReport(BaseModel):
    text: str = Field(min_length=4, max_length=2000)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    media_url: str | None = None
    source: str = "citizen_app"
    reported_at: datetime | None = None  # simulator timestamps (corroboration windows)


async def broadcast(channel: str, payload: dict) -> None:
    r = redis_client()
    try:
        await r.publish(channel, __import__("json").dumps(payload))
    finally:
        await r.aclose()


@router.post("/report", status_code=201)
async def create_report(body: IncomingReport, session: AsyncSession = Depends(get_session)):
    r = redis_client()
    try:
        if not in_india_bounds(body.lat, body.lon):
            raise HTTPException(status_code=422, detail="Coordinates outside Indian territory")

        dedup = DuplicateDetector(r)
        is_dup, why = await dedup.is_duplicate(body.text, body.lat, body.lon, body.media_url)

        report = Report(
            text=body.text,
            lat=body.lat,
            lon=body.lon,
            geom=WKTElement(f"POINT({body.lon} {body.lat})", srid=4326),
            media_url=body.media_url,
            source=body.source or "citizen_app",
            created_at=body.reported_at or datetime.now(timezone.utc),
            status=ReportStatus.PENDING,
        )
        session.add(report)
        await session.flush()  # assign id/created_at

        if is_dup:
            report.is_duplicate = True
            report.status = ReportStatus.AUTO_REJECTED
            report.audit_reason = f"duplicate · {why}"
            report.trust_score = 0.0
            await session.commit()
            return _serialize(report)

        # location resolution
        loc = resolve(body.lat, body.lon)
        report.state = loc["state"] or None
        report.district = loc["district"] or None

        # classification
        event_type, conf = classify(body.text)
        report.event_type = event_type
        report.event_conf = conf

        # trust score
        report.trust_score, reasons = await compute_trust(session, report)

        # verification state machine
        _decide_status(report, reasons)
        await session.commit()

        published = False
        if report.status in (ReportStatus.AUTO_VERIFIED, ReportStatus.VERIFIED):
            await broadcast(LIVE_MAP_CHANNEL, {"type": "report", "feature": report.to_geojson_feature()})
            published = True

        await dedup.record(str(report.id), body.text, body.lat, body.lon, body.media_url)

        result = _serialize(report)
        result["pipeline"] = {
            "state": report.state,
            "district": report.district,
            "event_type": report.event_type,
            "event_conf": report.event_conf,
            "corroboration_count": report.corroboration_count,
            "published_live": published,
        }
        return result
    finally:
        await r.aclose()


def _decide_status(report: Report, reasons: list[str]) -> None:
    reason = "; ".join(reasons) if reasons else "pipeline decision"
    if report.event_type is None:
        report.status = ReportStatus.AI_FLAGGED
        report.audit_reason = f"unclassified report · {reason}"
        return
    if report.trust_score >= AUTO_VERIFY_THRESHOLD and (report.event_conf or 0) >= 0.5:
        report.status = ReportStatus.AUTO_VERIFIED
        report.audit_reason = f"auto verified · {reason}"
    elif report.trust_score >= AI_FLAG_THRESHOLD:
        report.status = ReportStatus.AI_FLAGGED
        report.audit_reason = f"flagged for review · {reason}"
    else:
        report.status = ReportStatus.AUTO_REJECTED
        report.audit_reason = f"auto rejected · {reason}"


def _serialize(report: Report) -> dict:
    return {
        "id": str(report.id),
        "text": report.text,
        "lat": report.lat,
        "lon": report.lon,
        "event_type": report.event_type,
        "state": report.state,
        "district": report.district,
        "trust_score": report.trust_score,
        "corroboration_count": report.corroboration_count,
        "status": report.status.value,
        "is_duplicate": report.is_duplicate,
        "audit_reason": report.audit_reason,
        "media_url": report.media_url,
        "source": report.source,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }
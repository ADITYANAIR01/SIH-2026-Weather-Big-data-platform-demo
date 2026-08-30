"""Public read endpoints — verified reports only.

- GET /api/v1/public/clusters   → GeoJSON FeatureCollection (all VERIFIED/AUTO_VERIFIED)
- GET /api/v1/public/regions    → State → District cascade (real admin data)
- GET /api/v1/public/summary    → public-facing headline statistics
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..geo import regions
from ..models import PUBLIC_STATUSES, Report

router = APIRouter(prefix="/api/v1/public", tags=["public"])


@router.get("/clusters")
async def clusters(
    since_minutes: int = Query(1440, ge=1, le=60 * 24 * 30),
    state: str | None = None,
    district: str | None = None,
    event_type: str | None = None,
    bbox: str | None = None,  # min_x,min_y,max_x,max_y (lng,lat)
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Report).where(Report.status.in_(PUBLIC_STATUSES))
    since = datetime.now() - timedelta(minutes=since_minutes)
    stmt = stmt.where(Report.created_at >= since)
    if state:
        stmt = stmt.where(Report.state == state)
    if district:
        stmt = stmt.where(Report.district == district)
    if event_type:
        stmt = stmt.where(Report.event_type == event_type)
    if bbox:
        try:
            minx, miny, maxx, maxy = (float(v) for v in bbox.split(","))
        except ValueError:
            raise HTTPException(400, "bbox must be min_lng,min_lat,max_lng,max_lat")
        stmt = stmt.where(Report.lon >= minx, Report.lon <= maxx, Report.lat >= miny, Report.lat <= maxy)

    reports = (await session.execute(stmt.order_by(Report.created_at.desc()).limit(2000))).scalars().all()
    return {
        "type": "FeatureCollection",
        "features": [r.to_geojson_feature() for r in reports],
    }


@router.get("/regions")
async def regions_endpoint():
    return regions()


@router.get("/summary")
async def summary(session: AsyncSession = Depends(get_session)):
    today_start = datetime.combine(datetime.now().date(), datetime.min.time())
    total_stmt = (
        select(Report.status, func.count())
        .group_by(Report.status)
    )
    rows = (await session.execute(total_stmt)).all()
    by_status = {status.value: count for status, count in rows}

    today_count = (
        await session.execute(
            select(func.count()).select_from(Report).where(Report.created_at >= today_start)
        )
    ).scalar_one()

    top_event = (
        await session.execute(
            select(Report.event_type, func.count())
            .where(Report.status.in_(PUBLIC_STATUSES))
            .group_by(Report.event_type)
            .order_by(func.count().desc())
        )
    ).all()
    verified_today = (
        await session.execute(
            select(func.count())
            .select_from(Report)
            .where(Report.created_at >= today_start)
            .where(Report.status.in_(PUBLIC_STATUSES))
        )
    ).scalar_one()

    return {
        "total": sum(by_status.values()),
        "verified_live": by_status.get("auto_verified", 0) + by_status.get("verified", 0),
        "flagged": by_status.get("ai_flagged", 0),
        "rejected": by_status.get("auto_rejected", 0) + by_status.get("rejected", 0),
        "today": today_count,
        "today_verified": verified_today,
        "top_events": [{"event_type": e, "count": c} for e, c in top_event],
    }
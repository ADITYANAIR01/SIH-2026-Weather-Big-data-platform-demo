"""Admin endpoints (token-protected) — no real RBAC in the minimal backend.

- GET   /api/v1/admin/queue        → triage queue (PENDING / AI_FLAGGED / AUTO_REJECTED)
- PATCH /api/v1/admin/queue/{id}   → manual approve / reject (optimistic-UI friendly)
- GET   /api/v1/admin/stats        → plain-SQL aggregates for the analytics panel
- POST  /api/v1/admin/aggregate    → "Run Big Data Aggregation" (runs the same query)
"""

import json
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session, redis_client
from ..models import PUBLIC_STATUSES, QUEUE_STATUSES, Report, ReportStatus

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

ADMIN_EVENTS_CHANNEL = "admin-events"


def _queue_feature(r: Report) -> dict:
    feature = r.to_geojson_feature()
    feature["properties"].update(
        {
            "audit_reason": r.audit_reason,
            "is_duplicate": r.is_duplicate,
            "media_url": r.media_url,
        }
    )
    return feature


def _admin_token_dep(x_admin_token: str | None = Header(default=None, alias="x-admin-token"),
                     authorization: str | None = Header(default=None)):
    provided = x_admin_token
    if not provided and authorization and authorization.startswith("Bearer "):
        provided = authorization[7:]
    if provided != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return True


@router.get("/queue", dependencies=[Depends(_admin_token_dep)])
async def queue(session: AsyncSession = Depends(get_session)):
    stmt = (
        select(Report)
        .where(Report.status.in_(QUEUE_STATUSES))
        .order_by(Report.created_at.desc())
        .limit(300)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return {"queue": [_queue_feature(r) for r in rows]}


class QueueAction(BaseModel):
    action: str  # "approve" | "reject"


@router.patch("/queue/{report_id}", dependencies=[Depends(_admin_token_dep)])
async def queue_action(
    report_id: uuid.UUID,
    body: QueueAction,
    session: AsyncSession = Depends(get_session),
):
    report = await session.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    if body.action == "approve":
        report.status = ReportStatus.VERIFIED
        report.audit_reason = (report.audit_reason or "") + " · approved by admin"
    elif body.action == "reject":
        report.status = ReportStatus.REJECTED
        report.audit_reason = (report.audit_reason or "") + " · rejected by admin"
    else:
        raise HTTPException(status_code=422, detail="action must be 'approve' or 'reject'")

    await session.commit()

    r = redis_client()
    try:
        payloads = [
            {"type": "status_change", "report_id": str(report.id), "status": report.status.value}
        ]
        if report.status == ReportStatus.VERIFIED:
            payloads.append({"type": "report", "feature": report.to_geojson_feature()})
        for payload in payloads:
            await r.publish(ADMIN_EVENTS_CHANNEL if payload["type"] == "status_change" else "live-map",
                            json.dumps(payload))
    finally:
        await r.aclose()

    return {"ok": True, "status": report.status.value}


@router.get("/stats", dependencies=[Depends(_admin_token_dep)])
async def stats(session: AsyncSession = Depends(get_session)):
    return await _run_stats(session)


@router.post("/aggregate", dependencies=[Depends(_admin_token_dep)])
async def aggregate(session: AsyncSession = Depends(get_session)):
    """Admin "Run Big Data Aggregation" button — plain SQL aggregate, demo mode."""
    return await _run_stats(session)


@router.delete("/reset-dedup", dependencies=[Depends(_admin_token_dep)])
async def reset_dedup():
    """Clear the in-Redis deduplication ring buffer.

    The stream simulator calls this at the start of each replay pass so a live
    demo keeps producing verified reports; within-pass and manual duplicates
    are still flagged.
    """
    r = redis_client()
    try:
        await r.delete("dedup:recent")
    finally:
        await r.aclose()
    return {"ok": True, "cleared": "dedup:recent"}


async def _run_stats(session: AsyncSession) -> dict:
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    last_12h = datetime.now() - timedelta(hours=12)

    status_rows = (await session.execute(select(Report.status, func.count()).group_by(Report.status))).all()
    status_breakdown = {s.value: c for s, c in status_rows}

    state_rows = (
        await session.execute(
            select(Report.state, func.count())
            .where(Report.status.in_(PUBLIC_STATUSES))
            .group_by(Report.state)
            .order_by(func.count().desc())
            .limit(30)
        )
    ).all()

    hour_expr = func.date_trunc("hour", Report.created_at).label("hour")
    velocity_rows = (
        await session.execute(
            select(hour_expr, func.count())
            .where(Report.created_at >= last_12h)
            .group_by(hour_expr)
            .order_by(hour_expr)
        )
    ).all()

    queue_depth = (
        await session.execute(select(func.count()).select_from(Report).where(Report.status.in_(QUEUE_STATUSES)))
    ).scalar_one()

    today_total = (
        await session.execute(select(func.count()).select_from(Report).where(Report.created_at >= today_start))
    ).scalar_one()
    today_verified = (
        await session.execute(
            select(func.count()).select_from(Report)
            .where(Report.created_at >= today_start).where(Report.status.in_(PUBLIC_STATUSES))
        )
    ).scalar_one()

    return {
        "status_breakdown": status_breakdown,
        "by_state": [{"state": s or "unresolved", "count": c} for s, c in state_rows],
        "velocity": [
            {"hour": h.isoformat().replace("+00:00", "") + "Z", "count": c}
            for h, c in velocity_rows
        ],
        "queue_depth": int(queue_depth),
        "today_total": int(today_total),
        "today_verified": int(today_verified),
    }
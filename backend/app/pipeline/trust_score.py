"""Rule-based trust scoring.

Score = corroboration (independent reports within 500 m / 10 min using
ST_DWithin) blended with text/media heuristics. Corroboration is the largest
single signal; heuristics nudge the score and produce the human-readable
audit reason shown in the triage queue.
"""

import math
import re
from datetime import timedelta

from sqlalchemy import func, select

from ..models import Report, ReportStatus

CORROBORATION_RADIUS_M = 500.0
CORROBORATION_WINDOW_S = 600.0  # 10 minutes in either direction
STRONG_TRUST_WORDS = (
    "imd", "bom", "stevm", "ndma", "sdma", "bmd", "district administration",
    "alert", "evacuat", "met department", "rescue", "danger mark", "warning",
)
URGENT_WORDS = ("urgent", "help", "please", "immediate", "danger")
SPAM_WORDS = ("win free", "click here", "buy now", "lottery", "cash prize", "earn money")
UNCERTAIN_WORDS = ("i think", "maybe", "not sure", "perhaps", "rumour", "someone said")


async def compute_trust(session, report: Report) -> tuple[float, list[str]]:
    """Return (score 0..1, audit_reasons). Runs inside the request's session."""
    reasons: list[str] = []
    corroboration = await _count_corroboration(session, report)
    confidence, reasons_b = _heuristics_penalties(report)
    reasons.extend(reasons_b)

    if corroboration:
        reasons.append(f"corroborated by {corroboration} independent report(s) within 500 m / 10 min")

    # corroboration (same-event, within 500m/10min) is the dominant signal;
    # text/media heuristics modulate it. 2+ corroborators ⇒ auto-verify.
    corr_factor = min(corroboration, 2) / 2.0
    score = 0.55 * corr_factor + 0.45 * confidence

    report.corroboration_count = corroboration
    return max(0.0, min(1.0, score)), reasons


async def _count_corroboration(session, report: Report) -> int:
    # geography cast => ST_DWithin compares in METRES (plan: 500 m / 10 min).
    from geoalchemy2.types import Geography

    ref_geog = func.ST_GeographyFromText(f"SRID=4326;POINT({report.lon} {report.lat})")
    report_geog = Report.geom.cast(Geography(geometry_type="POINT", srid=4326))
    window = timedelta(seconds=CORROBORATION_WINDOW_S)
    stmt = (
        select(func.count())
        .select_from(Report)
        .where(Report.id != report.id)
        .where(Report.status != ReportStatus.REJECTED)
        .where(func.ST_DWithin(report_geog, ref_geog, CORROBORATION_RADIUS_M))
        .where(func.abs(func.extract("epoch", func.now() - Report.created_at)) < CORROBORATION_WINDOW_S)
    )
    if report.event_type:
        stmt = stmt.where(Report.event_type == report.event_type)
    result = await session.execute(stmt)
    return int(result.scalar_one() or 0)


def _heuristics_penalties(report: Report) -> tuple[float, list[str]]:
    text = (report.text or "").lower()
    reasons: list[str] = []

    base = 0.5

    if report.media_url:
        base += 0.1
        reasons.append("media attached")

    strong_hits = sum(1 for w in STRONG_TRUST_WORDS if w in text)
    base += min(strong_hits, 3) * 0.05
    if strong_hits:
        reasons.append(f"references official sources ({strong_hits})")

    numeric = re.findall(r"\b\d+(?:\.\d+)?\b", text)
    if len(numeric) >= 2:
        base += 0.05
        reasons.append("specific numbers/times reported")

    urgent = sum(1 for w in URGENT_WORDS if w in text)
    base += min(urgent, 3) * 0.03

    spam = sum(1 for w in SPAM_WORDS if w in text)
    if spam:
        base -= 0.45
        reasons.append("spam-like vocabulary")

    uncertain = sum(1 for w in UNCERTAIN_WORDS if w in text)
    if uncertain:
        base -= 0.2
        reasons.append("unverified/hedged language")

    if len(text) < 15:
        base -= 0.1
        reasons.append("very short report")

    return max(0.05, min(1.0, base)), reasons
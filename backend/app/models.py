"""Database models for the minimal weather platform.

Single `reports` table per the finalized architecture. All timestamps are
stored UTC and rendered as IST (UTC+5:30) at the edge.
"""

import enum
import uuid
from datetime import datetime, timezone

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class EventType(str, enum.Enum):
    """India-scoped event taxonomy (Section 0 of the plan)."""

    FLOODING = "flooding"
    HEATWAVE = "heatwave"
    COLD_WAVE = "cold_wave"
    CYCLONE = "cyclone"
    THUNDERSTORM = "thunderstorm_hailstorm"
    DUST_STORM = "dust_storm"
    FOG_SMOG = "fog_smog"
    LANDSLIDE = "landslide"
    DROUGHT = "drought"

    @classmethod
    def labels(cls) -> dict[str, str]:
        return {
            cls.FLOODING.value: "Flooding",
            cls.HEATWAVE.value: "Heatwave",
            cls.COLD_WAVE.value: "Cold Wave",
            cls.CYCLONE.value: "Cyclone",
            cls.THUNDERSTORM.value: "Thunderstorm / Hailstorm",
            cls.DUST_STORM.value: "Dust Storm",
            cls.FOG_SMOG.value: "Fog / Smog",
            cls.LANDSLIDE.value: "Landslide",
            cls.DROUGHT.value: "Drought",
        }


class ReportStatus(str, enum.Enum):
    """Verification state machine (plan §2 / finalized doc)."""

    PENDING = "pending"
    AUTO_VERIFIED = "auto_verified"
    AI_FLAGGED = "ai_flagged"
    AUTO_REJECTED = "auto_rejected"
    VERIFIED = "verified"  # admin manual approve
    REJECTED = "rejected"  # admin manual reject


PUBLIC_STATUSES = (ReportStatus.AUTO_VERIFIED, ReportStatus.VERIFIED)
QUEUE_STATUSES = (ReportStatus.PENDING, ReportStatus.AI_FLAGGED, ReportStatus.AUTO_REJECTED)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    text: Mapped[str] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    geom = mapped_column(
        Geometry(geometry_type="POINT", srid=4326),
        nullable=False,
    )
    event_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    event_conf: Mapped[float | None] = mapped_column(Float, nullable=True)
    state: Mapped[str | None] = mapped_column(String(64), nullable=True)
    district: Mapped[str | None] = mapped_column(String(64), nullable=True)
    trust_score: Mapped[float] = mapped_column(Float, default=0.0)
    corroboration_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status", native_enum=False),
        default=ReportStatus.PENDING,
        index=True,
    )
    audit_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    media_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="citizen_app")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=utcnow, index=True
    )

    def to_geojson_feature(self, excerpt_len: int = 140) -> dict:
        excerpt = (self.text or "").strip().replace("\n", " ")
        if len(excerpt) > excerpt_len:
            truncated = excerpt[:excerpt_len]
            if len(truncated.rsplit(" ", 1)[0]) + 1 > excerpt_len:
                truncated = truncated[: excerpt_len - 1]
            excerpt = truncated.rsplit(" ", 1)[0] + "…"
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [self.lon, self.lat],
            },
            "properties": {
                "id": str(self.id),
                "text": excerpt,
                "event_type": self.event_type,
                "state": self.state,
                "district": self.district,
                "trust_score": self.trust_score,
                "corroboration_count": self.corroboration_count,
                "source": self.source,
                "status": self.status.value,
                "created_at": self.created_at.isoformat() if self.created_at else None,
            },
        }
"""Error handling and edge-case tests for the Bharat Weather Observa backend."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db import get_session, init_db
from sqlalchemy.ext.asyncio import AsyncSession

# Patch redis_client at module level before the app imports routes
import backend.app.db as db_mod

def mock_redis_client():
    class MockRedis:
        async def publish(self, channel, payload):
            return None
        async def aclose(self):
            pass
    return MockRedis()

db_mod.redis_client = mock_redis_client


# Override the DB dependency to avoid needing a real database
async def mock_get_session() -> AsyncSession:
    """Mock session that yields a dummy session."""
    from sqlalchemy.orm import DeclarativeBase

    class Base(DeclarativeBase):
        pass

    from backend.app.models import Base as ReportBase

    # Use a real async engine but don't connect to DB
    # The session will be a no-op for these tests
    return None  # type: ignore


app.dependency_overrides[get_session] = mock_get_session

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "bharat-weather-observa"


def test_healthz_endpoint():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_coordinates_outside_india():
    """Coordinates outside Indian territory should return 422."""
    response = client.post(
        "/api/v1/report",
        json={"text": "test flooding", "lat": 90.0, "lon": 180.0},
    )
    assert response.status_code == 422
    assert "outside Indian territory" in response.json()["detail"]


def test_coordinates_outside_india_north():
    """Latitude north of India boundary."""
    response = client.post(
        "/api/v1/report",
        json={"text": "test flooding", "lat": 35.0, "lon": 75.0},
    )
    assert response.status_code == 422


def test_coordinates_outside_india_south():
    """Latitude south of India boundary."""
    response = client.post(
        "/api/v1/report",
        json={"text": "test flooding", "lat": -10.0, "lon": 78.0},
    )
    assert response.status_code == 422


def test_coordinates_outside_india_east():
    """Longitude east of India boundary."""
    response = client.post(
        "/api/v1/report",
        json={"text": "test flooding", "lat": 20.0, "lon": 150.0},
    )
    assert response.status_code == 422


def test_coordinates_outside_india_west():
    """Longitude west of India boundary."""
    response = client.post(
        "/api/v1/report",
        json={"text": "test flooding", "lat": 20.0, "lon": -180.0},
    )
    assert response.status_code == 422


def test_short_text_below_min_length():
    """Text below minimum length (4 chars) should be rejected by Pydantic."""
    response = client.post(
        "/api/v1/report",
        json={"text": "ab", "lat": 28.6139, "lon": 77.2090},
    )
    assert response.status_code == 422


def test_missing_required_fields():
    """Missing required fields should return 422."""
    response = client.post(
        "/api/v1/report",
        json={"lat": 28.6139},
    )
    assert response.status_code == 422


def test_invalid_latitude():
    """Latitude out of valid range should return 422."""
    response = client.post(
        "/api/v1/report",
        json={"text": "test", "lat": 100.0, "lon": 77.2090},
    )
    assert response.status_code == 422


def test_invalid_longitude():
    """Longitude out of valid range should return 422."""
    response = client.post(
        "/api/v1/report",
        json={"text": "test", "lat": 28.6139, "lon": 200.0},
    )
    assert response.status_code == 422


def test_report_without_coordinates():
    """Report missing lat/lon should be rejected by Pydantic validation."""
    response = client.post(
        "/api/v1/report",
        json={"text": "test"},
    )
    assert response.status_code == 422


def test_duplicate_empty_text():
    """Empty text should be detected as duplicate."""
    from backend.app.pipeline.dedup import _normalise_text

    assert _normalise_text("") == ""
    assert _normalise_text("   ") == ""
    assert _normalise_text("  Test  ") == "test"


def test_dedup_text_normalization():
    """Text normalization should handle various cases."""
    from backend.app.pipeline.dedup import _normalise_text

    assert _normalise_text("Hello  World") == "hello world"
    assert _normalise_text("\n\nHello\nWorld\n") == "hello world"


def test_classify_no_keywords():
    """Text with no matching keywords should return None."""
    from backend.app.pipeline.classify import classify
    event_type, conf = classify("just some random text")
    assert event_type is None
    assert conf == 0.0


def test_classify_cyclone():
    """Cyclone-related text should be classified."""
    from backend.app.pipeline.classify import classify
    event_type, conf = classify("cyclone approaching landfall in bay of bengal")
    assert event_type == "cyclone"


def test_classify_flooding():
    """Flooding-related text should be classified."""
    from backend.app.pipeline.classify import classify
    event_type, conf = classify("flooded roads in Mumbai")
    assert event_type == "flooding"


def test_classify_heatwave():
    """Heatwave-related text should be classified."""
    from backend.app.pipeline.classify import classify
    event_type, conf = classify("scorching heat wave today")
    assert event_type == "heatwave"


def test_public_clusters_invalid_bbox():
    """Public clusters endpoint with invalid bbox format."""
    response = client.get("/api/v1/public/clusters?bbox=invalid")
    assert response.status_code == 400
    data = response.json()
    assert "bbox must be" in data["detail"]


def test_report_serialization():
    """Report serialization should handle None values."""
    from backend.app.models import Report, ReportStatus
    from datetime import datetime, timezone
    import uuid

    report = Report(
        id=uuid.uuid4(),
        text="test",
        lat=28.6139,
        lon=77.2090,
        geom=None,
        event_type=None,
        event_conf=None,
        state=None,
        district=None,
        trust_score=0.5,
        corroboration_count=0,
        status=ReportStatus.PENDING,
        audit_reason=None,
        is_duplicate=False,
        media_url=None,
        source="citizen_app",
        created_at=datetime.now(timezone.utc),
    )

    geo_json = report.to_geojson_feature()
    assert geo_json["type"] == "Feature"
    assert geo_json["geometry"]["type"] == "Point"
    assert geo_json["geometry"]["coordinates"] == [77.2090, 28.6139]
    assert geo_json["properties"]["status"] == "pending"


def test_report_serialization_short_text():
    """Report serialization with short text should truncate properly."""
    from backend.app.models import Report, ReportStatus
    from datetime import datetime, timezone
    import uuid

    report = Report(
        id=uuid.uuid4(),
        text="A" * 200,
        lat=28.6139,
        lon=77.2090,
        geom=None,
        event_type=None,
        event_conf=None,
        state=None,
        district=None,
        trust_score=0.5,
        corroboration_count=0,
        status=ReportStatus.PENDING,
        audit_reason=None,
        is_duplicate=False,
        media_url=None,
        source="citizen_app",
        created_at=datetime.now(timezone.utc),
    )

    geo_json = report.to_geojson_feature(excerpt_len=140)
    assert len(geo_json["properties"]["text"]) <= 140
    assert geo_json["properties"]["text"].endswith("…")


def test_report_status_enum_values():
    """ReportStatus enum values should be valid."""
    from backend.app.models import ReportStatus

    valid_values = ["pending", "auto_verified", "ai_flagged", "auto_rejected", "verified", "rejected"]
    for val in valid_values:
        assert val in [e.value for e in ReportStatus]


def test_event_type_enum_values():
    """EventType enum values should be valid."""
    from backend.app.models import EventType

    valid_values = [
        "flooding",
        "heatwave",
        "cold_wave",
        "cyclone",
        "thunderstorm_hailstorm",
        "dust_storm",
        "fog_smog",
        "landslide",
        "drought",
    ]
    for val in valid_values:
        assert val in [e.value for e in EventType]


def test_invalid_bbox_format():
    """Invalid bbox format should return 400."""
    response = client.get("/api/v1/public/clusters?bbox=invalid")
    assert response.status_code == 400
    data = response.json()
    assert "bbox must be" in data["detail"]


def test_invalid_bbox_coords():
    """Bbox with non-numeric coords should return 400."""
    response = client.get("/api/v1/public/clusters?bbox=not_a_number")
    assert response.status_code == 400


def test_in_india_bounds():
    """Test the in_india_bounds geo function."""
    from backend.app.geo import in_india_bounds

    # Mumbai coordinates - should be inside
    assert in_india_bounds(19.0760, 72.8777) is True
    # London coordinates - should be outside
    assert in_india_bounds(51.5074, -0.1278) is False
    # Delhi coordinates - should be inside
    assert in_india_bounds(28.7041, 77.1025) is True


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
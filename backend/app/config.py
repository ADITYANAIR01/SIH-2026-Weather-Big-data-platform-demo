"""Application configuration.

All values are overridable via WEATHER_* environment variables so that
docker-compose can inject them without touching code.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WEATHER_", env_file=".env", extra="ignore")

    # Postgres / PostGIS connection (asyncpg driver)
    database_url: str = "postgresql+asyncpg://weather:weather@localhost:5432/weather"

    # Redis connection (pub/sub + dedup state)
    redis_url: str = "redis://localhost:6379/0"

    # Hardcoded admin token (no real RBAC in the minimal backend).
    # Frontend admin login must present this token to admin endpoints.
    admin_token: str = "sih2026-demo-admin-token"

    # Zero-shot HF classifier (heavy) — off by default; lexicon classifier is used.
    hf_classifier_enabled: bool = False

    # Nominatim reverse-geocoding is optional; local point-in-polygon is the default.
    nominatim_enabled: bool = False

    # Where the admin boundary + sample data files live (relative to backend/)
    data_dir: str = str(BACKEND_DIR / "data")

    # Stream simulator
    sim_api_base: str = "http://localhost:8000"
    sim_min_interval: float = 1.0
    sim_max_interval: float = 3.0

    @property
    def boundaries_path(self) -> Path:
        return Path(self.data_dir) / "india_boundaries.geojson"

    @property
    def sample_posts_path(self) -> Path:
        return Path(self.data_dir) / "sample_posts.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
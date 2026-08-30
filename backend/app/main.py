"""Bharat Weather Observa — live citizen-reporting data API (minimal slice)."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routes import admin, ingest, public, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Bharat Weather Observa — Live Data API",
    description=(
        "Minimal real slice: citizen weather reports for India, inline trust-scoring "
        "pipeline, state/district resolution, verification state machine and live "
        "WebSocket broadcast of verified reports."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(public.router)
app.include_router(admin.router)
app.include_router(ws.router)


@app.get("/")
async def root():
    return {
        "service": "bharat-weather-observa",
        "docs": "/docs",
        "health": "/healthz",
    }


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
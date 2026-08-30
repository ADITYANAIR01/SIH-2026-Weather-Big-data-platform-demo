"""WebSocket channels.

- /ws/live-map  — broadcasts newly auto-verified / approved reports as GeoJSON
- /ws/admin     — broadcasts admin triage status changes (approve/reject)

Each connected client opens its own Redis pub/sub subscription and is torn
down cleanly on disconnect. The browser reconnects with backoff automatically.
"""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..db import redis_client

router = APIRouter()

CHANNELS = {
    "live-map": "live-map",
    "admin": "admin-events",
}


async def _relay(client: WebSocket, channel: str, initial: dict | None = None):
    await client.accept()
    if initial:
        await client.send_text(json.dumps(initial))

    r = redis_client()
    try:
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        try:
            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue
                data = message.get("data")
                if isinstance(data, bytes):
                    data = data.decode()
                await client.send_text(data)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
    finally:
        await r.aclose()


@router.websocket("/ws/live-map")
async def live_map(ws: WebSocket):
    try:
        await _relay(ws, CHANNELS["live-map"], {"type": "connected", "channel": "live-map"})
    except WebSocketDisconnect:
        pass
    except Exception:
        await ws.close()


@router.websocket("/ws/admin")
async def admin_ws(ws: WebSocket):
    try:
        await _relay(ws, CHANNELS["admin"], {"type": "connected", "channel": "admin"})
    except WebSocketDisconnect:
        pass
    except Exception:
        await ws.close()
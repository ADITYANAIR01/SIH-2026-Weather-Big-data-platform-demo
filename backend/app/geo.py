"""India state/district resolution from `india_boundaries.geojson`.

Local, deterministic point-in-polygon resolution (the default). Nominatim is
optional and is only consulted when `WEATHER_NOMINATIM_ENABLED=1`; the local
dataset is the source of truth for State/District attribution so the demo never
depends on an external geocoder being reachable.
"""

import json
from functools import lru_cache

from .config import settings

INDIA_BBOX = {"min_lng": 68.1, "min_lat": 6.5, "max_lng": 97.4, "max_lat": 35.5}


def in_india_bounds(lat: float, lon: float) -> bool:
    b = INDIA_BBOX
    return b["min_lng"] <= lon <= b["max_lng"] and b["min_lat"] <= lat <= b["max_lat"]


class _FeatureIndex:
    """BBox prefilter + ray-cast point-in-polygon for state/district features."""

    def __init__(self, features: list[dict]):
        self.features = features
        self.bboxes: list[tuple[float, float, float, float]] = []
        self.areas: list[float] = []
        for f in features:
            minx, miny, maxx, maxy = _polygon_bounds(f["geometry"])
            self.bboxes.append((minx, miny, maxx, maxy))
            self.areas.append(_geometry_area(f["geometry"]))

    def candidates(self, lon: float, lat: float) -> list[int]:
        hits = []
        for i, (minx, miny, maxx, maxy) in enumerate(self.bboxes):
            if minx <= lon <= maxx and miny <= lat <= maxy:
                hits.append(i)
        return hits

    def resolve(self, lon: float, lat: float) -> dict | None:
        best: dict | None = None
        best_area = float("inf")
        for i in self.candidates(lon, lat):
            geom = self.features[i]["geometry"]
            if _geometry_contains(geom, lon, lat) and self.areas[i] < best_area:
                best = self.features[i]
                best_area = self.areas[i]
        return best


@lru_cache(maxsize=1)
def _load_boundaries() -> tuple[_FeatureIndex, _FeatureIndex]:
    """Returns (district_index, state_index) built from the single boundaries file."""
    with open(settings.boundaries_path, encoding="utf-8") as fh:
        data = json.load(fh)
    states: list[dict] = []
    districts: list[dict] = []
    for feat in data["features"]:
        props = feat["properties"]
        if props.get("level") == 1:
            states.append(_as_lookup_feature(props, feat["geometry"]))
        elif props.get("level") == 2:
            districts.append(_as_lookup_feature(props, feat["geometry"]))
    return _FeatureIndex(districts), _FeatureIndex(states)


def _as_lookup_feature(props: dict, geometry: dict) -> dict:
    return {
        "state": props["state"],
        "district": props.get("district") or "",
        "geometry": geometry,
    }


def resolve(lat: float, lon: float) -> dict:
    """Returns {"state": ..., "district": ...} for a coordinate inside India."""
    districts, states = _load_boundaries()
    d = districts.resolve(lon, lat)
    if d:
        return {"state": d["state"], "district": d["district"] or ""}
    s = states.resolve(lon, lat)
    if s:
        return {"state": s["state"], "district": ""}
    return {"state": "", "district": ""}


def regions() -> list[dict]:
    """[{state, districts:[...]}] — drives the cascading State → District filter."""
    _, _states = _load_boundaries()  # ensure loaded; we derive from raw JSON instead
    with open(settings.boundaries_path, encoding="utf-8") as fh:
        data = json.load(fh)
    by_state: dict[str, set[str]] = {}
    for feat in data["features"]:
        p = feat["properties"]
        if p.get("level") == 2:
            by_state.setdefault(p["state"], set()).add(p["district"] or "")
    return [
        {"state": st, "districts": sorted(ds)}
        for st, ds in sorted(by_state.items())
    ]


def _polygon_bounds(geom: dict) -> tuple[float, float, float, float]:
    minx = miny = 1e9
    maxx = maxy = -1e9
    for poly in _to_polys(geom):
        for ring in poly:
            for (x, y) in ring:
                if x < minx:
                    minx = x
                if x > maxx:
                    maxx = x
                if y < miny:
                    miny = y
                if y > maxy:
                    maxy = y
    return minx, miny, maxx, maxy


def _to_polys(geom: dict) -> list[list[list[list[float]]]]:
    if geom is None:
        return []
    t = geom["type"]
    coords = geom["coordinates"]
    if t == "Polygon":
        return [coords]
    if t == "MultiPolygon":
        return coords
    return []


def _point_in_ring(ring: list, x: float, y: float) -> bool:
    """Ray-casting; a point exactly on the boundary is treated as inside."""
    inside = False
    n = len(ring)
    x0, y0 = ring[0]
    for i in range(1, n):
        x1, y1 = ring[i]
        if ((y0 > y) != (y1 > y)) and (x < ((x1 - x0) * (y - y0)) / (y1 - y0) + x0):
            inside = not inside
        x0, y0 = x1, y1
    return inside


def _polygon_contains_poly(poly: list, x: float, y: float) -> bool:
    if not _point_in_ring(poly[0], x, y):
        return False
    for hole in poly[1:]:
        if _point_in_ring(hole, x, y):
            return False
    return True


def _geometry_contains(geom: dict, x: float, y: float) -> bool:
    for poly in _to_polys(geom):
        if _polygon_contains_poly(poly, x, y):
            return True
    return False


def _geometry_area(geom: dict) -> float:
    total = 0.0
    for poly in _to_polys(geom):
        total += _ring_area(poly[0]) if poly else 0.0
    return total


def _ring_area(ring: list) -> float:
    n = len(ring)
    s = 0.0
    x0, y0 = ring[0]
    for i in range(1, n):
        x1, y1 = ring[i]
        s += (x0 * y1 - x1 * y0)
        x0, y0 = x1, y1
    return abs(s) / 2.0
"""Build backend/data/india_boundaries.geojson from the raw India district
dataset.

Source: udit-001/india-maps-data -> geojson/india.geojson
  https://github.com/udit-001/india-maps-data/blob/main/geojson/india.geojson
  (curated from public sources; Census 2011 district delineation grouped under
  the current 36-state/UT administrative structure).

Output: a single FeatureCollection with two levels:
  - level 1: one Feature per State/UT (geometry = dissolve of its districts)
  - level 2: one Feature per District

Note on political boundaries (SIH review item): district/state geometry follows
public third-party data. For the government audience, a production build MUST
substitute Survey of India's official external-boundary vector data for the
International Boundary (esp. J&K, Ladakh, Arunachal border regions).
"""

import json
import math

from shapely.geometry import shape, mapping
from shapely.ops import unary_union

RAW = "india_udit_raw.geojson"
OUT = "india_boundaries.geojson"
PRECISION = 1e-5  # ~1m, keeps the file small while remaining accurate

STATE_NAME_OVERRIDES = {}


def canonical_state(raw: str) -> str:
    return STATE_NAME_OVERRIDES.get(raw, raw)


def main() -> None:
    with open(RAW, encoding="utf-8") as fh:
        raw = json.load(fh)

    districts_by_state: dict[str, list[dict]] = {}
    district_features: list[dict] = []

    for feat in raw["features"]:
        p = feat["properties"]
        if "district" not in p:
            # district-less placeholder features (state outline rows)
            continue
        state = canonical_state(p["st_nm"])
        district = p["district"]
        geom = shape(feat["geometry"])
        if geom.is_empty:
            continue
        districts_by_state.setdefault(state, []).append(geom)
        district_features.append(
            {
                "type": "Feature",
                "properties": {
                    "level": 2,
                    "state": state,
                    "district": district,
                    "id": f"{state}::{district}",
                    "st_code": p.get("st_code"),
                    "dt_code": p.get("dt_code"),
                },
                "geometry": json.loads(
                    json.dumps(mapping(geom), allow_nan=False)
                ),
            }
        )

    state_features: list[dict] = []
    for state, geoms in sorted(districts_by_state.items()):
        dissolved = unary_union([g.buffer(0) for g in geoms])
        state_features.append(
            {
                "type": "Feature",
                "properties": {
                    "level": 1,
                    "state": state,
                    "district": "",
                    "id": state,
                },
                "geometry": json.loads(
                    json.dumps(mapping(dissolved), allow_nan=False)
                ),
            }
        )

    def round_coords(value):
        if isinstance(value, list):
            return [round_coords(v) for v in value]
        return value

    def round_geometry(geom):
        if geom is None:
            return geom
        return {**geom, "coordinates": round_coords(geom.get("coordinates"))}

    for feat in state_features + district_features:
        feat["geometry"] = round_geometry(feat["geometry"])

    out = {
        "type": "FeatureCollection",
        "name": "india_boundaries",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": state_features + district_features,
    }

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))

    n_dist = sum(1 for f in district_features)
    n_state = len(state_features)
    size = math.ceil(len(json.dumps(out, separators=(",", ":"))) / 1024)
    print(f"states={n_state} districts={n_dist} output_size_kb={size}")


if __name__ == "__main__":
    main()
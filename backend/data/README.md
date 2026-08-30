# India administrative boundary data

| File | Contents |
| --- | --- |
| `india_boundaries.geojson` | Single FeatureCollection. `level: 1` = all 36 States/UTs (dissolved geometry), `level: 2` = 726 districts. Properties: `level`, `state`, `district`, `id`, `st_code`, `dt_code`. |
| `build_boundaries.py` | Regenerates `india_boundaries.geojson` from the raw upstream dataset. |

## Source & lineage

- **Dataset:** `udit-001/india-maps-data` → [`geojson/india.geojson`](https://github.com/udit-001/india-maps-data/blob/main/geojson/india.geojson)
- **Base:** Census of India 2011 district delineation, grouped under the *current* 36-State/UT administrative structure (Telangana, Ladakh, J&K, Odisha, Uttarakhand, DNH & Daman-Diu all present).
- **License:** repo states data is curated from publicly available sources; user bears no liability for misrepresentation. Treat as demo-grade.

## ⚠️ Political boundary review item (SIH audience)

District/state geometry is third-party derived. It does **not** guarantee Survey of
India's official International Boundary depiction (especially J&K, Ladakh, and the
Arunachal/Aksai Chin border alignments). Before any government-facing release, swap
in Survey of India official vector data (or the `datameet` SoI-sourced country
outline) and audit the disputed regions against `india-soi.geojson`.

## Regenerate

```bash
cd backend/data
pip install shapely
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson" -OutFile india_udit_raw.geojson   # (PowerShell)
python build_boundaries.py
```
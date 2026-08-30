"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  type FilterSpecification,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MLMap,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ClusterCollection, EventType, ReportStatus } from "@/lib/types";
import { EVENT_COLOR, EVENT_META, STATUS_META } from "@/lib/eventMeta";
import { fmtTime } from "@/lib/format";
import { INDIA_BBOX } from "@/lib/indiaBounds";
import { MAP_TOKENS } from "@/lib/mapTokens";

const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_META).map(([k, v]) => [k, v.color]),
);

export interface IndiaMapProps {
  mapId: string;
  clusters: ClusterCollection;
  variant: "public" | "admin";
  activeEvents?: EventType[] | null;
  activeStatuses?: ReportStatus[] | null;
  selectedDistrict?: { state: string; district: string } | null;
  selectedId?: string | null;
  onSelectFeature?: (id: string, coordinates: [number, number]) => void;
  onBgClick?: () => void;
}

function noopFilter(): FilterSpecification {
  return ["==", "", ""];
}

function buildStyle(variant: "public" | "admin"): StyleSpecification {
  const pointColor: unknown =
    variant === "public"
      ? [
          "match",
          ["get", "event_type"],
          ...Object.entries(EVENT_COLOR).flatMap(([k, v]) => [k, v]),
          "#64748B",
        ]
      : [
          "match",
          ["get", "status"],
          ...Object.entries(STATUS_COLOR).flatMap(([k, v]) => [k, v]),
          "#64748B",
        ];

  const pointRadius: unknown =
    variant === "public"
      ? 8
      : [
          "case",
          ["==", ["get", "status"], "rejected"], 5,
          ["==", ["get", "status"], "auto_rejected"], 5.5,
          8,
        ];

  const pointOpacity: unknown =
    variant === "public"
      ? 1
      : [
          "case",
          ["==", ["get", "status"], "rejected"], 0.45,
          ["==", ["get", "status"], "auto_rejected"], 0.55,
          1,
        ];

  return {
    version: 8,
    sources: {
      india: { type: "geojson", data: "/data/india-states.geojson" },
      districts: { type: "geojson", data: "/data/india-districts.geojson" },
      events: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 6,
        clusterRadius: 46,
        promoteId: "id",
      },
    },
    layers: [
      {
        id: "india-fill",
        type: "fill",
        source: "india",
        paint: { "fill-color": MAP_TOKENS.indiaFill },
      },
      {
        id: "india-border",
        type: "line",
        source: "india",
        paint: { "line-color": MAP_TOKENS.indiaBorder, "line-width": 0.6 },
      },
      {
        id: "state-hl-line",
        type: "line",
        source: "india",
        filter: noopFilter(),
        paint: { "line-color": MAP_TOKENS.districtLine, "line-width": 1.1 },
      },
      {
        id: "district-hl-fill",
        type: "fill",
        source: "districts",
        filter: noopFilter(),
        paint: { "fill-color": MAP_TOKENS.districtFill, "fill-opacity": 0.12 },
      },
      {
        id: "district-hl-line",
        type: "line",
        source: "districts",
        filter: noopFilter(),
        paint: {
          "line-color": MAP_TOKENS.districtLine,
          "line-width": 1.6,
          "line-dasharray": [2, 1.5],
        },
      },
      {
        id: "cluster-glow",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": MAP_TOKENS.clusterHalo,
          "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 1, 30, 3, 38, 8, 46],
          "circle-opacity": 0.25,
          "circle-blur": 1.2,
        },
      },
      {
        id: "cluster-circle",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": MAP_TOKENS.cluster,
          "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 1, 14, 3, 18, 8, 24],
          "circle-opacity": 0.92,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2,
        },
      },
      {
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 10,
          "text-font": ["Open Sans Bold"],
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#FFFFFF",
          "text-halo-color": "#1A232E",
          "text-halo-width": 1,
        },
      },
      {
        id: "events-glow",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": pointColor as string,
          "circle-radius": variant === "public" ? 18 : 13,
          "circle-opacity": 0.25,
          "circle-blur": 1.2,
        },
      },
      {
        id: "events-point",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": pointColor as string,
          "circle-radius": pointRadius as number,
          "circle-opacity": pointOpacity as number,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2,
        },
      },
      {
        id: "events-selected",
        type: "circle",
        source: "events",
        filter: noopFilter(),
        paint: {
          "circle-color": MAP_TOKENS.selected,
          "circle-radius": 12,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2.5,
        },
      },
    ],
  };
}

function setLayerFilter(map: MLMap, layerId: string, filter: FilterSpecification): void {
  const layer = map.getLayer(layerId);
  if (layer) (layer as unknown as { setFilter: (f: FilterSpecification) => void }).setFilter(filter);
}

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

interface HoverProps {
  event_type?: string | null;
  text?: string | null;
  editorial_headline?: string | null;
  state?: string | null;
  district?: string | null;
  created_at?: string | null;
  trust_score?: number | null;
  source?: string | null;
}

function buildHoverHtml(p: HoverProps): string {
  const ev = p.event_type && p.event_type in EVENT_META
    ? EVENT_META[p.event_type as EventType]
    : null;
  const color = ev?.mapColor ?? "#64748B";
  const title = p.editorial_headline ?? p.text?.slice(0, 72) ?? "Weather report";
  const where = [p.state, p.district && p.district !== p.state ? p.district : null]
    .filter(Boolean)
    .join(" / ");
  const trust = p.trust_score != null ? p.trust_score.toFixed(2) : "—";
  return (
    `<div style="max-width:260px;font-family:Inter,'Noto Sans Devanagari',sans-serif;padding:10px 12px;">` +
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">` +
    `<span style="width:8px;height:8px;border-radius:9999px;background:${color};"></span>` +
    `<span style="font-size:11px;font-weight:600;letter-spacing:.04em;color:${color};text-transform:uppercase;">` +
    `${esc(ev ? `${ev.label} · ${ev.hindi}` : "unclassified")}</span></div>` +
    `<div style="font-family:Georgia,'Noto Serif Devanagari',serif;font-size:14px;font-weight:600;line-height:1.3;color:#1A232E;">${esc(title)}</div>` +
    (where
      ? `<div style="margin-top:4px;font-size:11px;color:#475467;">${esc(where)}</div>` : "") +
    `<div style="margin-top:4px;font-family:'Roboto Mono',monospace;font-size:10px;font-variant-numeric:tabular-nums;color:#475467;">` +
    `${esc(fmtTime(p.created_at ?? ""))} IST · trust ${esc(trust)}</div>`
  );
}

function fitToDistrict(map: MLMap, state: string, district: string): void {
  const src = map.getSource("districts") as GeoJSONSource | undefined;
  if (!src?.getData) return;
  void src.getData().then((data) => {
    const fc = data as {
      features: {
        properties?: { state?: string; district?: string };
        geometry: { type: string; coordinates: number[][][] | number[][][][] };
      }[];
    };
    const feat = fc.features.find(
      (f) => f.properties?.state === state && f.properties?.district === district,
    );
    if (!feat) return;
    const points: [number, number][] =
      feat.geometry.type === "Polygon"
        ? (feat.geometry.coordinates as number[][][]).flat().map((c) => [c[0], c[1]] as [number, number])
        : (feat.geometry.coordinates as number[][][][]).flat(2).map((c) => [c[0], c[1]] as [number, number]);
    const lons = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 60, duration: 900, maxZoom: 9.5 },
    );
  });
}

export function IndiaMap({
  mapId,
  clusters,
  variant,
  activeEvents,
  activeStatuses,
  selectedDistrict,
  selectedId,
  onSelectFeature,
  onBgClick,
}: IndiaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(variant),
      center: [82.8, 22.8],
      zoom: 4.2,
      minZoom: 3.2,
      maxBounds: [INDIA_BBOX[0] - 1.2, INDIA_BBOX[1] - 1.0, INDIA_BBOX[2] + 1.2, INDIA_BBOX[3] + 1.0],
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      (map.getSource("events") as GeoJSONSource)?.setData(clusters);
      const pad: LngLatBoundsLike = [
        [INDIA_BBOX[0] - 0.4, INDIA_BBOX[1] - 0.3],
        [INDIA_BBOX[2] + 0.4, INDIA_BBOX[3] + 0.3],
      ];
      map.fitBounds(pad, { padding: { top: 30, bottom: 40, left: 30, right: 30 }, duration: 0 });

      map.on("click", (e) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ["cluster-circle", "events-point"] });
        if (feats.length === 0) {
          onBgClick?.();
          return;
        }
        const f = feats[0];
        if (f.geometry.type !== "Point") return;
        const props = f.properties as { cluster?: boolean; point_count?: number; id?: string };
        const coords: [number, number] = [f.geometry.coordinates[0], f.geometry.coordinates[1]];
        if (props.cluster) {
          map.flyTo({ center: coords, zoom: Math.max(map.getZoom() + 1.8, 6.4), speed: 1.2 });
          return;
        }
        if (props.id) onSelectFeature?.(props.id, coords);
      });

      const pointerInline = (layer: string) => {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      };
      pointerInline("cluster-circle");
      pointerInline("events-point");

      // Hover-pin preview: one reused popup (dense-live safe)
      let hoverPopup: maplibregl.Popup | null = null;
      map.on("mouseenter", "events-point", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const props = (f.properties ?? {}) as HoverProps;
        hoverPopup ??= new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "pin-hover",
          offset: 16,
        });
        const el = document.createElement("div");
        el.innerHTML = buildHoverHtml(props);
        hoverPopup.setLngLat([f.geometry.coordinates[0], f.geometry.coordinates[1]]).setDOMContent(el).addTo(map);
      });
      map.on("mouseleave", "events-point", () => {
        hoverPopup?.remove();
        hoverPopup = null;
      });
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [mapId, variant, onSelectFeature, onBgClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    (map.getSource("events") as GeoJSONSource | undefined)?.setData(clusters);

    if (variant === "public") {
      const anyEv = (activeEvents && activeEvents.length > 0
        ? (["any", ...activeEvents.map((e) => ["==", ["get", "event_type"], e])] as unknown as FilterSpecification)
        : null);
      setLayerFilter(map, "events-point", anyEv ?? noopFilter());
      setLayerFilter(map, "events-glow", anyEv ?? noopFilter());
    } else {
      const anySt = (activeStatuses && activeStatuses.length > 0
        ? (["any", ...activeStatuses.map((s) => ["==", ["get", "status"], s])] as unknown as FilterSpecification)
        : null);
      setLayerFilter(map, "events-point", anySt ?? noopFilter());
      setLayerFilter(map, "events-glow", anySt ?? noopFilter());
    }

    setLayerFilter(
      map,
      "events-selected",
      (selectedId ? ["==", ["get", "id"], selectedId] : noopFilter()) as FilterSpecification,
    );

    const hl = (
      selectedDistrict
        ? ["all",
            ["==", ["get", "state"], selectedDistrict.state],
            ["==", ["get", "district"], selectedDistrict.district],
          ]
        : noopFilter()
    ) as FilterSpecification;
    setLayerFilter(map, "district-hl-fill", hl);
    setLayerFilter(map, "district-hl-line", hl);

    // State-level ring when only a state (no district) is tracked
    setLayerFilter(
      map,
      "state-hl-line",
      ((selectedDistrict && !selectedDistrict.district)
        ? ["==", ["get", "state"], selectedDistrict.state]
        : noopFilter()) as FilterSpecification,
    );

    if (selectedDistrict) fitToDistrict(map, selectedDistrict.state, selectedDistrict.district);
  }, [clusters, variant, activeEvents, activeStatuses, selectedDistrict, selectedId]);

  return (
    <div
      ref={containerRef}
      id={mapId}
      tabIndex={0}
      role="region"
      aria-label="Live weather map of India. Hover a marker to preview a report."
      className="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50"
    />
  );
}

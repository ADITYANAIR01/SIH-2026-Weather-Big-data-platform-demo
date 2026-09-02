import type { EventType, ReportStatus } from "./types";

interface EventMeta {
  label: string;
  hindi: string;
  mapColor: string;
  chip: string;
  dot: string;
}

export const EVENT_META: Record<EventType, EventMeta> = {
  flood: {
    label: "Flood",
    hindi: "बाढ़",
    mapColor: "#0E7FB0",
    chip: "border-bay/40 bg-bay/10 text-bay-deep",
    dot: "bg-bay",
  },
  cyclone: {
    label: "Cyclone",
    hindi: "चक्रवात",
    mapColor: "#5A4BD1",
    chip: "border-velvet/40 bg-velvet/10 text-velvet-deep",
    dot: "bg-velvet",
  },
  heatwave: {
    label: "Heat wave",
    hindi: "लू",
    mapColor: "#E8622C",
    chip: "border-saffron/40 bg-saffron/10 text-saffron-deep",
    dot: "bg-saffron",
  },
  coldwave: {
    label: "Cold wave",
    hindi: "शीत लहर",
    mapColor: "#3E7FA8",
    chip: "border-frost/40 bg-frost/10 text-frost-deep",
    dot: "bg-frost",
  },
  dust_storm: {
    label: "Dust storm",
    hindi: "धूल भरी आंधी",
    mapColor: "#C05621",
    chip: "border-sand/40 bg-sand/10 text-sand-deep",
    dot: "bg-sand",
  },
  landslide: {
    label: "Landslide",
    hindi: "भूस्खलन",
    mapColor: "#8A6B46",
    chip: "border-earth/40 bg-earth/10 text-earth-deep",
    dot: "bg-earth",
  },
  drought: {
    label: "Drought",
    hindi: "सूखा",
    mapColor: "#C2A010",
    chip: "border-olive/40 bg-olive/10 text-olive-deep",
    dot: "bg-olive",
  },
  thunderstorm: {
    label: "Thunderstorm",
    hindi: "तूफ़ान",
    mapColor: "#B78A3F",
    chip: "border-dune/40 bg-dune/10 text-dune-deep",
    dot: "bg-dune",
  },
  fog: {
    label: "Fog / smog",
    hindi: "कोहरा",
    mapColor: "#7B8794",
    chip: "border-mists/40 bg-mists/10 text-mists-deep",
    dot: "bg-mists",
  },
};

export const EVENT_ORDER: EventType[] = [
  "flood",
  "cyclone",
  "heatwave",
  "coldwave",
  "dust_storm",
  "landslide",
  "drought",
  "thunderstorm",
  "fog",
];

export const EVENT_COLOR: Record<EventType, string> = Object.fromEntries(
  EVENT_ORDER.map((e) => [e, EVENT_META[e].mapColor]),
) as Record<EventType, string>;

interface StatusMeta {
  label: string;
  hindi: string;
  color: string;
  chip: string;
}

export const STATUS_META: Record<ReportStatus, StatusMeta> = {
  pending: {
    label: "Pending",
    hindi: "लंबित",
    color: "#E8622C",
    chip: "border-saffron/40 bg-saffron/10 text-saffron-deep",
  },
  ai_flagged: {
    label: "AI flagged",
    hindi: "AI चिह्नित",
    color: "#B78A3F",
    chip: "border-dune/40 bg-dune/10 text-dune-deep",
  },
  auto_verified: {
    label: "Auto-verified",
    hindi: "स्वतः सत्यापित",
    color: "#1E9E67",
    chip: "border-green/40 bg-green/10 text-green-deep",
  },
  verified: {
    label: "Verified",
    hindi: "सत्यापित",
    color: "#1E9E67",
    chip: "border-green/40 bg-green/10 text-green-deep",
  },
  auto_rejected: {
    label: "Auto-rejected",
    hindi: "स्वतः अस्वीकृत",
    color: "#D92D20",
    chip: "border-hazard/40 bg-hazard/10 text-hazard",
  },
  rejected: {
    label: "Rejected",
    hindi: "अस्वीकृत",
    color: "#D92D20",
    chip: "border-hazard/40 bg-hazard/10 text-hazard",
  },
};

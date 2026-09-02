export type EventType =
  | "flood"
  | "cyclone"
  | "heatwave"
  | "coldwave"
  | "dust_storm"
  | "landslide"
  | "drought"
  | "thunderstorm"
  | "fog";

export type ReportStatus =
  | "pending"
  | "ai_flagged"
  | "auto_verified"
  | "verified"
  | "auto_rejected"
  | "rejected";

export interface ClusterProps {
  id: string;
  text: string;
  editorial_headline?: string | null;
  event_type?: EventType | null;
  state?: string | null;
  district?: string | null;
  created_at: string;
  source: string;
  trust_score?: number | null;
  corroboration_count: number;
  lat: number;
  lon: number;
  status: ReportStatus;
  audit_reason?: string | null;
  pipeline?: {
    event_type?: string;
    event_conf?: number;
    corroboration_count?: number;
  } | null;
}

export interface Report extends ClusterProps {}

export interface ClusterCollection {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: ClusterProps;
  }[];
}

export interface DeskStats {
  queue_depth: number;
  today_total: number;
  today_verified: number;
  velocity: { hour: string; count: number }[];
  by_state: { state: string; count: number }[];
  status_breakdown: Record<string, number>;
}

export interface Region {
  state: string;
  districts: string[];
}

export interface ReportResult {
  id: string;
  status: ReportStatus;
  state?: string | null;
  district?: string | null;
  event_type?: string | null;
  trust_score?: number | null;
  corroboration_count: number;
  is_duplicate: boolean;
}

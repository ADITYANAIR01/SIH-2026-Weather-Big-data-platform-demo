"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClusterCollection, DeskStats, Region, Report, EventType, ReportStatus } from "./types";

const MOCK_REGIONS: Region[] = [
  { state: "Delhi", districts: ["New Delhi", "North Delhi", "South Delhi"] },
  { state: "Maharashtra", districts: ["Mumbai", "Pune", "Nagpur"] },
  { state: "Karnataka", districts: ["Bengaluru Urban", "Mysuru", "Mangaluru"] },
  { state: "Tamil Nadu", districts: ["Chennai", "Coimbatore", "Madurai"] },
  { state: "West Bengal", districts: ["Kolkata", "Howrah", "Darjeeling"] },
  { state: "Kerala", districts: ["Thiruvananthapuram", "Kochi", "Kozhikode"] },
  { state: "Rajasthan", districts: ["Jaipur", "Jodhpur", "Udaipur"] },
  { state: "Assam", districts: ["Guwahati", "Dibrugarh", "Silchar"] },
  { state: "Uttar Pradesh", districts: ["Lucknow", "Varanasi", "Agra"] },
  { state: "Gujarat", districts: ["Ahmedabad", "Surat", "Rajkot"] },
  { state: "Odisha", districts: ["Bhubaneswar", "Cuttack", "Puri"] },
  { state: "Himachal Pradesh", districts: ["Shimla", "Manali", "Kullu"] },
];

function minsAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function hrsAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

interface MockReport {
  id: string;
  text: string;
  editorial_headline: string | null;
  event_type: EventType;
  state: string;
  district: string;
  lat: number;
  lon: number;
  created_at: string;
  source: string;
  trust_score: number;
  corroboration_count: number;
  status: ReportStatus;
  audit_reason: string;
  pipeline: { event_type: string; event_conf: number; corroboration_count: number };
}

const MOCK_REPORTS: MockReport[] = [
  {
    id: "rpt-001",
    text: "Heavy waterlogging on Marine Drive after 3 hours of continuous downpour. Sea water breaching the promenade near Gateway of India.",
    editorial_headline: "Mumbai Marine Drive flooded as high tide meets monsoon downpour",
    event_type: "flood",
    state: "Maharashtra",
    district: "Mumbai",
    lat: 18.9432,
    lon: 72.8234,
    created_at: minsAgo(12),
    source: "citizen_app",
    trust_score: 0.912,
    corroboration_count: 4,
    status: "verified",
    audit_reason: "Corroborated by 4 reports within 500 m / 10 min. Classified as flood by pipeline.",
    pipeline: { event_type: "flood", event_conf: 0.94, corroboration_count: 4 },
  },
  {
    id: "rpt-002",
    text: "Extreme heat in Jaipur today. Road surface melting near Johari Bazaar. Multiple people reported fainted at the bus stand.",
    editorial_headline: "Jaipur sizzles at 46°C — heat wave paralyzes daily life",
    event_type: "heatwave",
    state: "Rajasthan",
    district: "Jaipur",
    lat: 26.9124,
    lon: 75.7873,
    created_at: minsAgo(35),
    source: "citizen_app",
    trust_score: 0.876,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports. IMD station confirms 46.2°C.",
    pipeline: { event_type: "heatwave", event_conf: 0.91, corroboration_count: 3 },
  },
  {
    id: "rpt-003",
    text: "Cyclonic winds hitting Puri coast. Waves 4-5 meters high. Fishermen warned not to venture out. Trees uprooted in Konark area.",
    editorial_headline: "Cyclone alert along Odisha coast — high waves pound Puri and Konark",
    event_type: "cyclone",
    state: "Odisha",
    district: "Puri",
    lat: 19.8135,
    lon: 85.8312,
    created_at: minsAgo(58),
    source: "citizen_app",
    trust_score: 0.934,
    corroboration_count: 5,
    status: "verified",
    audit_reason: "5 corroborating reports. IMD cyclone warning confirmed.",
    pipeline: { event_type: "cyclone", event_conf: 0.97, corroboration_count: 5 },
  },
  {
    id: "rpt-004",
    text: "Heavy fog visibility near zero on Delhi-Agra highway. Multiple vehicles moving at crawling speed. Accidents reported near Mathura.",
    editorial_headline: "Dense fog blankets Delhi-NCR — zero visibility on highways",
    event_type: "fog",
    state: "Delhi",
    district: "New Delhi",
    lat: 28.6139,
    lon: 77.209,
    created_at: hrsAgo(1),
    source: "citizen_app",
    trust_score: 0.821,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. IMD confirms dense fog advisory.",
    pipeline: { event_type: "fog", event_conf: 0.88, corroboration_count: 2 },
  },
  {
    id: "rpt-005",
    text: "Landslide on Shimla-Manali highway near Kullu. Road completely blocked. Tourists stranded. JCB machines deployed for clearing.",
    editorial_headline: "Landslide blocks Shimla-Manali highway — tourists stranded near Kullu",
    event_type: "landslide",
    state: "Himachal Pradesh",
    district: "Kullu",
    lat: 31.9584,
    lon: 77.1087,
    created_at: hrsAgo(2),
    source: "citizen_app",
    trust_score: 0.889,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 reports within 400 m. Highway authority confirms blockage.",
    pipeline: { event_type: "landslide", event_conf: 0.92, corroboration_count: 3 },
  },
  {
    id: "rpt-006",
    text: "Thunderstorm with heavy rain in Kolkata. Lightning struck a tree near Victoria Memorial. Power outage in several areas.",
    editorial_headline: "Kolkata hit by severe thunderstorm — lightning fells tree near Victoria Memorial",
    event_type: "thunderstorm",
    state: "West Bengal",
    district: "Kolkata",
    lat: 22.5726,
    lon: 88.3639,
    created_at: hrsAgo(3),
    source: "citizen_app",
    trust_score: 0.845,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. State disaster control confirms.",
    pipeline: { event_type: "thunderstorm", event_conf: 0.89, corroboration_count: 2 },
  },
  {
    id: "rpt-007",
    text: "Dust storm approaching Ahmedabad from the west. Visibility dropping rapidly. Sand particles hitting face. Cars pulling over.",
    editorial_headline: "Massive dust storm sweeps into Ahmedabad — visibility drops sharply",
    event_type: "dust_storm",
    state: "Gujarat",
    district: "Ahmedabad",
    lat: 23.0225,
    lon: 72.5714,
    created_at: hrsAgo(4),
    source: "citizen_app",
    trust_score: 0.803,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 reports. IMD dust storm warning active for Gujarat.",
    pipeline: { event_type: "dust_storm", event_conf: 0.85, corroboration_count: 2 },
  },
  {
    id: "rpt-008",
    text: "Cold wave in Lucknow. Temperature dropped to 3°C overnight. People sleeping on railway platforms being given blankets by NGOs.",
    editorial_headline: "Lucknow shivers at 3°C — cold wave grips central Uttar Pradesh",
    event_type: "coldwave",
    state: "Uttar Pradesh",
    district: "Lucknow",
    lat: 26.8467,
    lon: 80.9462,
    created_at: hrsAgo(5),
    source: "citizen_app",
    trust_score: 0.778,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. IMD confirms cold wave conditions.",
    pipeline: { event_type: "coldwave", event_conf: 0.82, corroboration_count: 2 },
  },
  {
    id: "rpt-009",
    text: "Severe waterlogging in Bengaluru after overnight rain. Many apartments in Whitefield area have water entering ground floors.",
    editorial_headline: "Bengaluru floods again — Whitefield apartments submerged after overnight rain",
    event_type: "flood",
    state: "Karnataka",
    district: "Bengaluru Urban",
    lat: 12.9716,
    lon: 77.5946,
    created_at: hrsAgo(6),
    source: "citizen_app",
    trust_score: 0.867,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports from Whitefield area.",
    pipeline: { event_type: "flood", event_conf: 0.9, corroboration_count: 3 },
  },
  {
    id: "rpt-010",
    text: "Water levels rising in Brahmaputra near Guwahati. Low-lying areas of Fancy Bazaar getting inundated. NDRF teams on standby.",
    editorial_headline: "Brahmaputra swells near Guwahati — low-lying Fancy Bazaar underwater",
    event_type: "flood",
    state: "Assam",
    district: "Guwahati",
    lat: 26.1445,
    lon: 91.7362,
    created_at: hrsAgo(7),
    source: "citizen_app",
    trust_score: 0.891,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports. Water resources dept confirms rising levels.",
    pipeline: { event_type: "flood", event_conf: 0.93, corroboration_count: 3 },
  },
  {
    id: "rpt-011",
    text: "Drought conditions in Marathwada. Crops withering. Farmers demand immediate government intervention. Wells running dry.",
    editorial_headline: "Marathwada drought deepens — farmers plead for relief as wells run dry",
    event_type: "drought",
    state: "Maharashtra",
    district: "Pune",
    lat: 18.5204,
    lon: 73.8567,
    created_at: hrsAgo(8),
    source: "citizen_app",
    trust_score: 0.756,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. Agricultural dept confirms moisture deficit.",
    pipeline: { event_type: "drought", event_conf: 0.78, corroboration_count: 2 },
  },
  {
    id: "rpt-012",
    text: "Thunderstorm approaching Chennai. Dark clouds over the Bay of Bengal. Fishermen returning to shore. Heavy rain expected within the hour.",
    editorial_headline: "Chennai braces for thunderstorm as dark clouds roll in from the Bay",
    event_type: "thunderstorm",
    state: "Tamil Nadu",
    district: "Chennai",
    lat: 13.0827,
    lon: 80.2707,
    created_at: hrsAgo(9),
    source: "citizen_app",
    trust_score: 0.812,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. IMD thunderstorm watch active.",
    pipeline: { event_type: "thunderstorm", event_conf: 0.86, corroboration_count: 2 },
  },
  {
    id: "rpt-013",
    text: "Cyclone remnants bringing heavy rain to Kochi. Backwaters overflowing. Several houses in Alappuzha affected.",
    editorial_headline: "Cyclone aftermath hits Kerala — backwaters overflow in Alappuzha",
    event_type: "cyclone",
    state: "Kerala",
    district: "Kochi",
    lat: 9.9312,
    lon: 76.2673,
    created_at: hrsAgo(10),
    source: "citizen_app",
    trust_score: 0.834,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. NDRF confirms affected areas.",
    pipeline: { event_type: "cyclone", event_conf: 0.87, corroboration_count: 2 },
  },
  {
    id: "rpt-014",
    text: "Heat wave conditions in Nagpur. Temperature touching 45°C. Stray animals suffering. Municipal water tankers deployed.",
    editorial_headline: "Nagpur boils at 45°C — heat wave strains civic infrastructure",
    event_type: "heatwave",
    state: "Maharashtra",
    district: "Nagpur",
    lat: 21.1458,
    lon: 79.0882,
    created_at: hrsAgo(11),
    source: "citizen_app",
    trust_score: 0.798,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. IMD Nagpur confirms extreme heat.",
    pipeline: { event_type: "heatwave", event_conf: 0.84, corroboration_count: 2 },
  },
  {
    id: "rpt-015",
    text: "Fog in Agra near Taj Mahal. Tourists disappointed as the monument is barely visible. Visibility down to 50 meters.",
    editorial_headline: "Taj Mahal shrouded in fog — visibility drops to 50 meters in Agra",
    event_type: "fog",
    state: "Uttar Pradesh",
    district: "Agra",
    lat: 27.1767,
    lon: 78.0081,
    created_at: hrsAgo(12),
    source: "citizen_app",
    trust_score: 0.765,
    corroboration_count: 1,
    status: "verified",
    audit_reason: "1 corroborating report. IMD fog advisory for western UP.",
    pipeline: { event_type: "fog", event_conf: 0.81, corroboration_count: 1 },
  },
  {
    id: "rpt-016",
    text: "Flash flood warning in Darjeeling hills. Rivers rising fast after sudden rainfall. Evacuation advisory issued for low-lying areas.",
    editorial_headline: "Flash flood alert in Darjeeling — rivers rising rapidly after heavy rain",
    event_type: "flood",
    state: "West Bengal",
    district: "Darjeeling",
    lat: 27.041,
    lon: 88.2663,
    created_at: minsAgo(8),
    source: "citizen_app",
    trust_score: 0.901,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports. District admin confirms evacuation advisory.",
    pipeline: { event_type: "flood", event_conf: 0.95, corroboration_count: 3 },
  },
  {
    id: "rpt-017",
    text: "Landslide reported in Mysuru district road connecting Ooty. Two vehicles trapped. Rescue operations underway.",
    editorial_headline: "Landslide traps vehicles on Mysuru-Ooty road — rescue underway",
    event_type: "landslide",
    state: "Karnataka",
    district: "Mysuru",
    lat: 12.2958,
    lon: 76.6394,
    created_at: hrsAgo(14),
    source: "citizen_app",
    trust_score: 0.823,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. Highway patrol confirms incident.",
    pipeline: { event_type: "landslide", event_conf: 0.87, corroboration_count: 2 },
  },
  {
    id: "rpt-018",
    text: "Severe cold wave in Jodhpur. Temperature at 1°C. Desert camp tourists struggling. Local administration opens night shelters.",
    editorial_headline: "Jodhpur freezes at 1°C — cold wave grips the Thar desert edge",
    event_type: "coldwave",
    state: "Rajasthan",
    district: "Jodhpur",
    lat: 26.2389,
    lon: 73.0243,
    created_at: hrsAgo(15),
    source: "citizen_app",
    trust_score: 0.789,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. IMD confirms cold wave in western Rajasthan.",
    pipeline: { event_type: "coldwave", event_conf: 0.83, corroboration_count: 2 },
  },
  {
    id: "rpt-019",
    text: "Dust devil spotted near Surat industrial area.轻minory damage to temporary structures. Workers evacuated safely.",
    editorial_headline: "Dust devil hits Surat industrial zone — minor structural damage",
    event_type: "dust_storm",
    state: "Gujarat",
    district: "Surat",
    lat: 21.1702,
    lon: 72.8311,
    created_at: hrsAgo(16),
    source: "citizen_app",
    trust_score: 0.742,
    corroboration_count: 1,
    status: "verified",
    audit_reason: "1 corroborating report. Industrial safety officer confirms.",
    pipeline: { event_type: "dust_storm", event_conf: 0.79, corroboration_count: 1 },
  },
  {
    id: "rpt-020",
    text: "Drought-like situation in Madurai. Cauvery water flow reduced significantly. Farmers worried about samba crop season.",
    editorial_headline: "Madurai faces water crisis as Cauvery flow dips — farmers on edge",
    event_type: "drought",
    state: "Tamil Nadu",
    district: "Madurai",
    lat: 9.9252,
    lon: 78.1198,
    created_at: hrsAgo(18),
    source: "citizen_app",
    trust_score: 0.731,
    corroboration_count: 1,
    status: "verified",
    audit_reason: "1 corroborating report. Water resources dept data confirms low flow.",
    pipeline: { event_type: "drought", event_conf: 0.76, corroboration_count: 1 },
  },
  {
    id: "rpt-021",
    text: " thunderstorm approaching Varanasi ghats. Boats recalled from the Ganges. Tourists asked to move away from riverfront.",
    editorial_headline: "Thunderstorm alert in Varanasi — boats recalled from Ganges ghats",
    event_type: "thunderstorm",
    state: "Uttar Pradesh",
    district: "Varanasi",
    lat: 25.3176,
    lon: 82.9739,
    created_at: minsAgo(45),
    source: "citizen_app",
    trust_score: 0.856,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. District administration confirms alert.",
    pipeline: { event_type: "thunderstorm", event_conf: 0.9, corroboration_count: 2 },
  },
  {
    id: "rpt-022",
    text: "Cyclonic rain in Mangaluru. Coastal areas getting battered. Fishing boats anchored. Tree falls reported in multiple locations.",
    editorial_headline: "Cyclonic rain batters Mangaluru — tree falls across coastal areas",
    event_type: "cyclone",
    state: "Karnataka",
    district: "Mangaluru",
    lat: 12.9141,
    lon: 74.856,
    created_at: minsAgo(90),
    source: "citizen_app",
    trust_score: 0.878,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports. Coast guard confirms rough sea conditions.",
    pipeline: { event_type: "cyclone", event_conf: 0.91, corroboration_count: 3 },
  },
  {
    id: "rpt-023",
    text: "Heat stroke cases reported from Howrah railway station. Several commuters collapsed while waiting on platforms. Ambulances called.",
    editorial_headline: "Heat stroke cases at Howrah station — commuters collapse on platforms",
    event_type: "heatwave",
    state: "West Bengal",
    district: "Howrah",
    lat: 22.5726,
    lon: 88.3639,
    created_at: minsAgo(150),
    source: "citizen_app",
    trust_score: 0.812,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. Hospital confirms heat stroke admissions.",
    pipeline: { event_type: "heatwave", event_conf: 0.86, corroboration_count: 2 },
  },
  {
    id: "rpt-024",
    text: "Flash floods in Silchar after sudden cloudburst. Roads turned into rivers. People stranded on rooftops in several localities.",
    editorial_headline: "Cloudburst triggers flash floods in Silchar — people stranded on rooftops",
    event_type: "flood",
    state: "Assam",
    district: "Silchar",
    lat: 24.8333,
    lon: 92.7789,
    created_at: minsAgo(25),
    source: "citizen_app",
    trust_score: 0.923,
    corroboration_count: 4,
    status: "verified",
    audit_reason: "4 corroborating reports. District collector confirms flash flood.",
    pipeline: { event_type: "flood", event_conf: 0.96, corroboration_count: 4 },
  },
];

const MOCK_QUEUE: Report[] = [
  {
    ...MOCK_REPORTS[20],
    status: "pending",
    audit_reason: "",
  },
  {
    id: "rpt-q1",
    text: "Heavy rain in Nagpur city. Several roads waterlogged. Traffic moving slowly on Wardhaman Road.",
    editorial_headline: null,
    event_type: "flood",
    state: "Maharashtra",
    district: "Nagpur",
    lat: 21.1458,
    lon: 79.0882,
    created_at: minsAgo(5),
    source: "citizen_app",
    trust_score: 0.45,
    corroboration_count: 0,
    status: "pending",
    audit_reason: "",
    pipeline: { event_type: "flood", event_conf: 0.62, corroboration_count: 0 },
  },
  {
    id: "rpt-q2",
    text: "Strong winds in Pune. Several hoardings damaged. No casualties reported but traffic disrupted on FC Road.",
    editorial_headline: null,
    event_type: "thunderstorm",
    state: "Maharashtra",
    district: "Pune",
    lat: 18.5204,
    lon: 73.8567,
    created_at: minsAgo(18),
    source: "citizen_app",
    trust_score: 0.52,
    corroboration_count: 1,
    status: "ai_flagged",
    audit_reason: "AI flagged: possible thunderstorm classification",
    pipeline: { event_type: "thunderstorm", event_conf: 0.71, corroboration_count: 1 },
  },
  {
    id: "rpt-q3",
    text: "Someone posted about rain in their area. No specific location given. Text is very vague.",
    editorial_headline: null,
    event_type: null,
    state: null,
    district: null,
    lat: 20.5,
    lon: 78.9,
    created_at: minsAgo(30),
    source: "citizen_app",
    trust_score: 0.18,
    corroboration_count: 0,
    status: "auto_rejected",
    audit_reason: "Auto-rejected: insufficient detail, no location",
    pipeline: { event_type: undefined, event_conf: 0.22, corroboration_count: 0 },
  },
  {
    id: "rpt-q4",
    text: "Possible landslide on Nainital road. Rocks falling from the hillside. Traffic halted for 20 minutes.",
    editorial_headline: null,
    event_type: "landslide",
    state: "Uttar Pradesh",
    district: "Agra",
    lat: 27.1767,
    lon: 78.0081,
    created_at: minsAgo(42),
    source: "citizen_app",
    trust_score: 0.61,
    corroboration_count: 1,
    status: "pending",
    audit_reason: "",
    pipeline: { event_type: "landslide", event_conf: 0.68, corroboration_count: 1 },
  },
];

function buildClusters(reports: MockReport[]): ClusterCollection {
  return {
    type: "FeatureCollection",
    features: reports.map((r) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [r.lon, r.lat] as [number, number],
      },
      properties: { ...r },
    })),
  };
}

function buildStats(reports: MockReport[]): DeskStats {
  const hourBuckets = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const h = `${String(i).padStart(2, "0")}:00`;
    hourBuckets.set(h, Math.floor(Math.random() * 8) + 1);
  }

  const stateCounts = new Map<string, number>();
  for (const r of reports) {
    stateCounts.set(r.state, (stateCounts.get(r.state) ?? 0) + 1);
  }
  const by_state = [...stateCounts.entries()]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  const status_breakdown: Record<string, number> = {
    verified: reports.length,
    pending: MOCK_QUEUE.filter((r) => r.status === "pending").length,
    ai_flagged: MOCK_QUEUE.filter((r) => r.status === "ai_flagged").length,
    auto_rejected: MOCK_QUEUE.filter((r) => r.status === "auto_rejected").length,
  };

  return {
    queue_depth: MOCK_QUEUE.length,
    today_total: reports.length + MOCK_QUEUE.length,
    today_verified: reports.length,
    velocity: [...hourBuckets.entries()].map(([hour, count]) => ({ hour, count })),
    by_state,
    status_breakdown,
  };
}

interface PublicDataState {
  clusters: ClusterCollection;
  stats: DeskStats | null;
  regions: Region[];
  loadState: "loading" | "ready" | "error";
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePublicData(): PublicDataState {
  const [clusters, setClusters] = useState<ClusterCollection>(() =>
    buildClusters(MOCK_REPORTS),
  );
  const [stats, setStats] = useState<DeskStats | null>(() => buildStats(MOCK_REPORTS));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadState((s) => (s === "ready" ? "ready" : "loading"));
      setClusters(buildClusters(MOCK_REPORTS));
      setStats(buildStats(MOCK_REPORTS));
      setLoadState("ready");
      setError(null);
    } catch (e) {
      setLoadState("error");
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    clusters,
    stats,
    regions: MOCK_REGIONS,
    loadState,
    error,
    refresh: load,
  };
}

interface DeskDataState {
  queue: Report[];
  verified: ClusterCollection;
  stats: DeskStats | null;
  loadState: "loading" | "ready" | "error";
  error: string | null;
  refresh: () => Promise<void>;
  updateQueue: (updater: (prev: Report[]) => Report[]) => void;
}

export function useDeskData(): DeskDataState {
  const [queue, setQueue] = useState<Report[]>(MOCK_QUEUE);
  const [verified, setVerified] = useState<ClusterCollection>(() =>
    buildClusters(MOCK_REPORTS),
  );
  const [stats, setStats] = useState<DeskStats | null>(() => buildStats(MOCK_REPORTS));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoadState((s) => (s === "ready" ? "ready" : "loading"));
      setQueue(MOCK_QUEUE);
      setVerified(buildClusters(MOCK_REPORTS));
      setStats(buildStats(MOCK_REPORTS));
      if (mountedRef.current) {
        setLoadState("ready");
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setLoadState("error");
        setError(String(e));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return {
    queue,
    verified,
    stats,
    loadState,
    error,
    refresh: load,
    updateQueue: (updater) => setQueue(updater),
  };
}

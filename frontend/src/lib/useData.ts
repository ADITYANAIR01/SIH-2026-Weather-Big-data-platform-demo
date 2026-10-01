"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClusterCollection, DeskStats, Region, Report, EventType, ReportStatus } from "./types";

const DATA_MODE = process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "mock";

type BackendFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

function normalizeEventType(value: unknown): EventType | null {
  const aliases: Record<string, EventType> = {
    flooding: "flood",
    flood: "flood",
    cyclone: "cyclone",
    heatwave: "heatwave",
    cold_wave: "coldwave",
    coldwave: "coldwave",
    thunderstorm_hailstorm: "thunderstorm",
    thunderstorm: "thunderstorm",
    dust_storm: "dust_storm",
    fog_smog: "fog",
    fog: "fog",
    landslide: "landslide",
    drought: "drought",
  };
  return typeof value === "string" ? aliases[value] ?? null : null;
}

function normalizeFeature(feature: BackendFeature): ClusterCollection["features"][number] {
  const p = feature.properties;
  const eventType = normalizeEventType(p.event_type);
  return {
    type: "Feature",
    geometry: feature.geometry,
    properties: {
      id: String(p.id ?? ""),
      text: String(p.text ?? ""),
      editorial_headline: typeof p.editorial_headline === "string" ? p.editorial_headline : null,
      event_type: eventType,
      state: typeof p.state === "string" ? p.state : null,
      district: typeof p.district === "string" ? p.district : null,
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      created_at: String(p.created_at ?? new Date().toISOString()),
      source: String(p.source ?? "citizen_app"),
      trust_score: typeof p.trust_score === "number" ? p.trust_score : null,
      corroboration_count: Number(p.corroboration_count ?? 0),
      status: (p.status as ReportStatus) ?? "pending",
      audit_reason: typeof p.audit_reason === "string" ? p.audit_reason : null,
      pipeline: p.pipeline && typeof p.pipeline === "object"
        ? { ...(p.pipeline as Record<string, unknown>), event_type: eventType ?? undefined }
        : null,
    },
  };
}

function normalizeClusters(payload: { features?: BackendFeature[] }): ClusterCollection {
  return {
    type: "FeatureCollection",
    features: (payload.features ?? []).map(normalizeFeature),
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

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
  { state: "Bihar", districts: ["Patna", "Gaya", "Muzaffarpur"] },
  { state: "Telangana", districts: ["Hyderabad", "Warangal", "Nizamabad"] },
  { state: "Punjab", districts: ["Amritsar", "Ludhiana", "Patiala"] },
  { state: "Jammu and Kashmir", districts: ["Srinagar", "Ramban", "Jammu"] },
  { state: "Andhra Pradesh", districts: ["Anantapur", "Visakhapatnam", "Vijayawada"] },
  { state: "Goa", districts: ["North Goa", "South Goa"] },
  { state: "Jharkhand", districts: ["Ranchi", "Jamshedpur", "Dhanbad"] },
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
  {
    id: "rpt-025",
    text: "Heavy rain has flooded low-lying lanes in Patna near the Ganga. Residents are using boats to cross the street and power is intermittent.",
    editorial_headline: "Monsoon rain floods Patna lanes as Ganga-side neighbourhoods lose power",
    event_type: "flood",
    state: "Bihar",
    district: "Patna",
    lat: 25.5941,
    lon: 85.1376,
    created_at: minsAgo(16),
    source: "citizen_app",
    trust_score: 0.864,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports. Municipal control room confirms waterlogging.",
    pipeline: { event_type: "flood", event_conf: 0.91, corroboration_count: 3 },
  },
  {
    id: "rpt-026",
    text: "A dense smoke and fog layer has settled over Ahmedabad before sunrise. Visibility is below 100 metres on the ring road.",
    editorial_headline: "Dense fog and smog slow Ahmedabad traffic before sunrise",
    event_type: "fog",
    state: "Gujarat",
    district: "Ahmedabad",
    lat: 23.0225,
    lon: 72.5714,
    created_at: minsAgo(28),
    source: "citizen_app",
    trust_score: 0.793,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. Traffic police confirms reduced visibility.",
    pipeline: { event_type: "fog", event_conf: 0.86, corroboration_count: 2 },
  },
  {
    id: "rpt-027",
    text: "A squall line is moving across Hyderabad with intense lightning and gusts. Several neighbourhoods have lost power.",
    editorial_headline: "Lightning squall crosses Hyderabad as neighbourhoods report power cuts",
    event_type: "thunderstorm",
    state: "Telangana",
    district: "Hyderabad",
    lat: 17.385,
    lon: 78.4867,
    created_at: minsAgo(39),
    source: "citizen_app",
    trust_score: 0.847,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. State emergency operations centre confirms storm activity.",
    pipeline: { event_type: "thunderstorm", event_conf: 0.9, corroboration_count: 2 },
  },
  {
    id: "rpt-028",
    text: "A dry, hot wind is blowing through Amritsar. The temperature reached 44°C and outdoor workers have moved into shaded areas.",
    editorial_headline: "Amritsar heat wave pushes temperatures to 44°C",
    event_type: "heatwave",
    state: "Punjab",
    district: "Amritsar",
    lat: 31.634,
    lon: 74.8723,
    created_at: hrsAgo(2),
    source: "citizen_app",
    trust_score: 0.818,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. Local weather station records 43.8°C.",
    pipeline: { event_type: "heatwave", event_conf: 0.88, corroboration_count: 2 },
  },
  {
    id: "rpt-029",
    text: "A dust storm has crossed Bikaner, reducing visibility on the Jaipur highway. Sand is collecting around roadside shops.",
    editorial_headline: "Dust storm sweeps Bikaner highway and cuts visibility",
    event_type: "dust_storm",
    state: "Rajasthan",
    district: "Bikaner",
    lat: 28.0229,
    lon: 73.3119,
    created_at: hrsAgo(3),
    source: "citizen_app",
    trust_score: 0.786,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. Highway patrol confirms low visibility.",
    pipeline: { event_type: "dust_storm", event_conf: 0.84, corroboration_count: 2 },
  },
  {
    id: "rpt-030",
    text: "Rockfall has blocked one lane on the Jammu-Srinagar highway near Ramban. Traffic is being held while crews clear the road.",
    editorial_headline: "Rockfall blocks Jammu-Srinagar highway near Ramban",
    event_type: "landslide",
    state: "Jammu and Kashmir",
    district: "Ramban",
    lat: 33.2425,
    lon: 75.2405,
    created_at: hrsAgo(4),
    source: "citizen_app",
    trust_score: 0.856,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports. Highway control room confirms lane closure.",
    pipeline: { event_type: "landslide", event_conf: 0.93, corroboration_count: 3 },
  },
  {
    id: "rpt-031",
    text: "The Mahanadi is rising near Cuttack after two days of rain. Villages along the embankment have started moving livestock to higher ground.",
    editorial_headline: "Mahanadi rises near Cuttack as villages move livestock uphill",
    event_type: "flood",
    state: "Odisha",
    district: "Cuttack",
    lat: 20.4625,
    lon: 85.883,
    created_at: hrsAgo(5),
    source: "citizen_app",
    trust_score: 0.882,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports. Water resources officials confirm rising river levels.",
    pipeline: { event_type: "flood", event_conf: 0.92, corroboration_count: 3 },
  },
  {
    id: "rpt-032",
    text: "Rainfall has stopped in Anantapur but wells and tanks remain dry. Farmers are delaying sowing for the second week.",
    editorial_headline: "Anantapur farmers delay sowing as drought conditions persist",
    event_type: "drought",
    state: "Andhra Pradesh",
    district: "Anantapur",
    lat: 14.6819,
    lon: 77.6006,
    created_at: hrsAgo(6),
    source: "citizen_app",
    trust_score: 0.746,
    corroboration_count: 1,
    status: "verified",
    audit_reason: "1 corroborating report. Agriculture officers confirm below-normal rainfall.",
    pipeline: { event_type: "drought", event_conf: 0.8, corroboration_count: 1 },
  },
  {
    id: "rpt-033",
    text: "A cold wave has pushed the temperature in Srinagar below zero. Dal Lake has a thin ice layer and morning flights are delayed.",
    editorial_headline: "Srinagar wakes below zero as cold wave delays morning flights",
    event_type: "coldwave",
    state: "Jammu and Kashmir",
    district: "Srinagar",
    lat: 34.0837,
    lon: 74.7973,
    created_at: hrsAgo(7),
    source: "citizen_app",
    trust_score: 0.841,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. Airport operations confirm weather-related delays.",
    pipeline: { event_type: "coldwave", event_conf: 0.9, corroboration_count: 2 },
  },
  {
    id: "rpt-034",
    text: "Cyclonic winds are battering the coast near Panaji. Fishing boats remain in harbour and waves are overtopping the promenade.",
    editorial_headline: "Cyclonic winds keep Goa boats in harbour as waves cross the promenade",
    event_type: "cyclone",
    state: "Goa",
    district: "North Goa",
    lat: 15.4909,
    lon: 73.8278,
    created_at: hrsAgo(8),
    source: "citizen_app",
    trust_score: 0.879,
    corroboration_count: 3,
    status: "verified",
    audit_reason: "3 corroborating reports. Port authorities confirm rough sea conditions.",
    pipeline: { event_type: "cyclone", event_conf: 0.92, corroboration_count: 3 },
  },
  {
    id: "rpt-035",
    text: "A severe thunderstorm has crossed Ranchi with hail and sharp wind gusts. Tin roofs were damaged in two neighbourhoods.",
    editorial_headline: "Hailstorm crosses Ranchi and damages roofs across two neighbourhoods",
    event_type: "thunderstorm",
    state: "Jharkhand",
    district: "Ranchi",
    lat: 23.3441,
    lon: 85.3096,
    created_at: hrsAgo(9),
    source: "citizen_app",
    trust_score: 0.824,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. District control room confirms hail and wind damage.",
    pipeline: { event_type: "thunderstorm", event_conf: 0.89, corroboration_count: 2 },
  },
  {
    id: "rpt-036",
    text: "Dense fog has covered the Brahmaputra valley near Dibrugarh. Visibility is poor on the airport road and ferries are delayed.",
    editorial_headline: "Dense fog delays ferries and airport traffic near Dibrugarh",
    event_type: "fog",
    state: "Assam",
    district: "Dibrugarh",
    lat: 27.4728,
    lon: 94.912,
    created_at: hrsAgo(10),
    source: "citizen_app",
    trust_score: 0.799,
    corroboration_count: 2,
    status: "verified",
    audit_reason: "2 corroborating reports. Transport officials confirm visibility disruption.",
    pipeline: { event_type: "fog", event_conf: 0.87, corroboration_count: 2 },
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

function buildLivePublicStats(
  clusters: ClusterCollection,
  summary: { today?: number; today_verified?: number; verified_live?: number; flagged?: number; rejected?: number },
): DeskStats {
  const stateCounts = new Map<string, number>();
  for (const feature of clusters.features) {
    const state = feature.properties.state;
    if (state) stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
  }
  return {
    queue_depth: 0,
    today_total: summary.today ?? clusters.features.length,
    today_verified: summary.today_verified ?? summary.verified_live ?? clusters.features.length,
    velocity: [],
    by_state: [...stateCounts.entries()]
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count),
    status_breakdown: {
      verified: summary.verified_live ?? clusters.features.length,
      ai_flagged: summary.flagged ?? 0,
      auto_rejected: summary.rejected ?? 0,
    },
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
    DATA_MODE === "live" ? { type: "FeatureCollection", features: [] } : buildClusters(MOCK_REPORTS),
  );
  const [stats, setStats] = useState<DeskStats | null>(() =>
    DATA_MODE === "live" ? null : buildStats(MOCK_REPORTS),
  );
  const [regions, setRegions] = useState<Region[]>(MOCK_REGIONS);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadState((s) => (s === "ready" ? "ready" : "loading"));
      if (DATA_MODE === "live") {
        const [clusterPayload, summary, liveRegions] = await Promise.all([
          fetchJson<{ features?: BackendFeature[] }>("public/clusters"),
          fetchJson<{ today?: number; today_verified?: number; verified_live?: number; flagged?: number; rejected?: number }>("public/summary"),
          fetchJson<Region[]>("public/regions"),
        ]);
        const liveClusters = normalizeClusters(clusterPayload);
        setClusters(liveClusters);
        setStats(buildLivePublicStats(liveClusters, summary));
        setRegions(liveRegions);
      } else {
        setClusters(buildClusters(MOCK_REPORTS));
        setStats(buildStats(MOCK_REPORTS));
        setRegions(MOCK_REGIONS);
      }
      setLoadState("ready");
      setError(null);
    } catch (e) {
      setLoadState("error");
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    if (DATA_MODE !== "live") return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  return {
    clusters,
    stats,
    regions,
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
  const [queue, setQueue] = useState<Report[]>(DATA_MODE === "live" ? [] : MOCK_QUEUE);
  const [verified, setVerified] = useState<ClusterCollection>(() =>
    DATA_MODE === "live" ? { type: "FeatureCollection", features: [] } : buildClusters(MOCK_REPORTS),
  );
  const [stats, setStats] = useState<DeskStats | null>(() =>
    DATA_MODE === "live" ? null : buildStats(MOCK_REPORTS),
  );
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoadState((s) => (s === "ready" ? "ready" : "loading"));
      if (DATA_MODE === "live") {
        const [queuePayload, clusterPayload, liveStats] = await Promise.all([
          fetchJson<{ queue?: BackendFeature[] }>("admin/queue"),
          fetchJson<{ features?: BackendFeature[] }>("public/clusters"),
          fetchJson<DeskStats>("admin/stats"),
        ]);
        setQueue((queuePayload.queue ?? []).map((feature) => normalizeFeature(feature).properties));
        setVerified(normalizeClusters(clusterPayload));
        setStats(liveStats);
      } else {
        setQueue(MOCK_QUEUE);
        setVerified(buildClusters(MOCK_REPORTS));
        setStats(buildStats(MOCK_REPORTS));
      }
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
    if (DATA_MODE !== "live") return () => { mountedRef.current = false; };
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
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

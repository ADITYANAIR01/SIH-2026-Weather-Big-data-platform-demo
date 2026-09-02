import type { ReportResult } from "./types";

export type DataMode = "mock" | "live";

// eslint-disable-next-line prefer-const
let _dataMode: DataMode = "mock";
export const dataMode: DataMode = _dataMode;

export const modeLabel = "MOCK" as string;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function submitReport(payload: {
  text: string;
  lat: number;
  lon: number;
  source: string;
}): Promise<ReportResult> {
  if (dataMode === "mock") {
    return {
      id: crypto.randomUUID(),
      status: "pending",
      state: "Delhi",
      district: "New Delhi",
      event_type: null,
      trust_score: 0.55,
      corroboration_count: 0,
      is_duplicate: false,
    };
  }
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  return res.json();
}

export async function deskAction(
  id: string,
  body: { action: "approve" | "reject" | "promote"; headline?: string; note: string },
): Promise<void> {
  if (dataMode === "mock") return;
  const res = await fetch(`${API_BASE}/api/reports/${id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Action failed: ${res.status}`);
}

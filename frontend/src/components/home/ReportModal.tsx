"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT_META, EVENT_ORDER } from "@/lib/eventMeta";
import type { EventType, ReportResult } from "@/lib/types";
import { submitReport } from "@/lib/data";
import { IconCheck, IconReport, IconX } from "../icons";

const QUICK_CITIES: { name: string; lat: number; lon: number }[] = [
  { name: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Hyderabad", lat: 17.385, lon: 78.4867 },
  { name: "Puri", lat: 19.8135, lon: 85.8312 },
  { name: "Srinagar", lat: 34.0837, lon: 74.7973 },
  { name: "Shillong", lat: 25.5788, lon: 91.8933 },
  { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
];

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [city, setCity] = useState<string>(QUICK_CITIES[0].name);
  const [eventHint, setEventHint] = useState<EventType | "">("");
  const [lat, setLat] = useState(QUICK_CITIES[0].lat);
  const [lon, setLon] = useState(QUICK_CITIES[0].lon);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Focus management: remember trigger, focus first input, restore on close
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      // wait a frame for the modal to mount
      requestAnimationFrame(() => textareaRef.current?.focus());
    } else if (triggerRef.current) {
      triggerRef.current.focus?.();
      triggerRef.current = null;
    }
  }, [open]);

  // Escape to close + focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const nodes = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((n) => !n.hasAttribute("disabled"));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === dialogRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pickCity = (value: string) => {
    const c = QUICK_CITIES.find((x) => x.name === value);
    if (c) {
      setCity(value);
      setLat(c.lat);
      setLon(c.lon);
    }
  };

  const onSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const r = await submitReport({ text: text.trim(), lat, lon, source: "citizen_app" });
      setResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm motion-reduce:transition-none"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-card shadow-lift"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* saffron header rule */}
        <div className="h-1 w-full rounded-t-2xl bg-saffron" aria-hidden />

        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="kicker mb-1">Citizen report · <span lang="hi">जन रिपोर्ट</span></div>
              <h2 id="report-modal-title" className="serif-display text-2xl text-ink">
                Report a weather event
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-paperdeep hover:text-ink motion-reduce:transition-none"
              aria-label="Close report dialog"
            >
              <IconX width={18} height={18} />
            </button>
          </div>

          {result ? (
            <div className="animate-card-in motion-reduce:animate-none">
              <div className="flex items-start gap-3 rounded-xl border border-green/30 bg-green/10 p-4 text-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green/10 ring-2 ring-green/20">
                  <IconCheck width={18} height={18} className="text-green" />
                </span>
                <div>
                  <div className="font-semibold text-green-deep">Received by the desk</div>
                  <div className="mt-1 text-ink/70">
                    Pipeline says: <strong>{result.state ?? "—"}</strong> / {result.district ?? "—"} ·
                    classified {result.event_type ?? "unclassified"}
                  </div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-cobalt/10 bg-cobalt-50/50 p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-strong">Acknowledgment</dt>
                  <dd className="mt-1 truncate font-mono tabular text-[11px] text-cobalt-700">{result.id}</dd>
                </div>
                <div className="rounded-lg border border-cobalt/10 bg-cobalt-50/50 p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-strong">Status</dt>
                  <dd className="mt-1 font-medium text-ink">{result.status}</dd>
                </div>
                <div className="rounded-lg border border-cobalt/10 bg-cobalt-50/50 p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-strong">Initial trust score</dt>
                  <dd className="mt-1 font-mono tabular text-ink">{result.trust_score?.toFixed(3) ?? "—"}</dd>
                </div>
                <div className="rounded-lg border border-cobalt/10 bg-cobalt-50/50 p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-strong">Corroboration</dt>
                  <dd className="mt-1 font-medium text-ink">{result.corroboration_count} reports</dd>
                </div>
              </dl>
              {result.is_duplicate ? (
                <p className="mt-3 rounded-lg border border-hazard/30 bg-hazard/10 p-3 text-xs text-hazard">
                  Duplicate flagged: near-identical text/location already logged.
                </p>
              ) : null}
              <button onClick={onClose} className="btn-primary mt-4 w-full">Done</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="report-text" className="mb-1 block text-xs font-semibold text-ink/70">
                  What happened?
                </label>
                <textarea
                  ref={textareaRef}
                  id="report-text"
                  className="input min-h-[96px] resize-y"
                  placeholder="e.g. Heavy rain flooding the Marine Drive road, sea water over the curb near Gateway"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink/70">
                  Event type <span className="font-normal text-muted">(optional)</span>
                </label>
                <select
                  className="input"
                  value={eventHint}
                  onChange={(e) => setEventHint(e.target.value as EventType | "")}
                >
                  <option value="">Auto-detect</option>
                  {EVENT_ORDER.map((e) => (
                    <option key={e} value={e}>{EVENT_META[e].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink/70">Near which city?</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CITIES.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => pickCity(c.name)}
                      aria-pressed={city === c.name}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors motion-reduce:transition-none ${
                        city === c.name
                          ? "bg-ink text-white"
                          : "bg-paperdeep text-ink/70 hover:bg-line hover:text-ink"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="report-lat" className="mb-1 block text-xs font-semibold text-ink/70">
                    Latitude
                  </label>
                  <input
                    id="report-lat"
                    className="input font-mono tabular text-xs"
                    value={Number.isFinite(lat) ? lat : ""}
                    onChange={(e) => setLat(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label htmlFor="report-lon" className="mb-1 block text-xs font-semibold text-ink/70">
                    Longitude
                  </label>
                  <input
                    id="report-lon"
                    className="input font-mono tabular text-xs"
                    value={Number.isFinite(lon) ? lon : ""}
                    onChange={(e) => setLon(Number(e.target.value))}
                  />
                </div>
              </div>
              <p className="font-mono tabular text-[11px] text-muted-strong">
                Inside India bounds · 68.1°E–97.4°E ∕ 6.5°N–35.5°N
              </p>

              {error ? (
                <p role="alert" className="rounded-lg border border-hazard/30 bg-hazard/10 p-3 text-xs text-hazard">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <button onClick={onSubmit} disabled={submitting || !text.trim()} className="btn-primary flex-1">
                  <IconReport width={15} height={15} />
                  {submitting ? "Submitting…" : "Send to the desk"}
                </button>
                <button onClick={onClose} className="btn-secondary">Cancel</button>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted">
                Reports outside India&apos;s map bounds are rejected. Your report is deduplicated and shown
                to the verification desk before ever reaching this page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

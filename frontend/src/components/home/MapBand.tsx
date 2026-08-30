"use client";

import { useCallback, useMemo, useState } from "react";
import type { ClusterCollection, EventType, Region } from "@/lib/types";
import { EVENT_META, EVENT_ORDER } from "@/lib/eventMeta";
import { INDIA_BBOX } from "@/lib/indiaBounds";
import { fmtTime } from "@/lib/format";
import MapCanvas from "../map/MapCanvas";
import { IconChevronRight } from "../icons";
import { WhyVerified } from "./WhyVerified";

function SelectedStory({
  cluster,
  onClose,
}: {
  cluster: ClusterCollection["features"][number] | null;
  onClose: () => void;
}) {
  if (!cluster) return null;
  const p = cluster.properties;
  const meta = p.event_type ? EVENT_META[p.event_type] : null;
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 sm:inset-x-auto sm:left-auto sm:right-3 sm:w-[400px]">
      <div
        className="animate-card-in pointer-events-auto overflow-hidden rounded-xl border border-white/10 border-l-4 bg-ink/70 text-paper shadow-lift backdrop-blur motion-reduce:animate-none"
        style={{ borderLeftColor: meta?.mapColor ?? "var(--ink)" }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4 pb-3">
          <div>
            {meta ? (
              <span className={`chip ${meta.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label} · <span lang="hi">{meta.hindi}</span>
              </span>
            ) : null}
            <h3 className="serif-display mt-2 text-lg leading-snug text-paper">
              {p.editorial_headline ?? p.text.slice(0, 90)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-paper/70 transition-colors hover:bg-white/10 hover:text-paper motion-reduce:transition-none"
            aria-label="Close story"
          >
            ✕
          </button>
        </div>
        <p className="px-4 py-3 text-sm leading-relaxed text-paper/80">{p.text}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-3 font-mono text-[11px] text-paper/60">
          <span>{p.state ?? "—"}{p.district && p.district !== p.state ? ` / ${p.district}` : ""}</span>
          <span>·</span>
          <span>{fmtTime(p.created_at)} IST</span>
          <span>·</span>
          <span>{p.source}</span>
          {p.corroboration_count > 0 ? <span>· {p.corroboration_count} corroborating</span> : null}
        </div>
        <div className="px-4 pb-4">
          <details className="group">
            <summary className="cursor-pointer select-none text-xs font-semibold text-[#9dbcf7] transition-colors hover:text-[#c7d9ff] motion-reduce:transition-none">
              How was this verified?
            </summary>
            <div className="mt-2">
              <WhyVerified report={p} variant="dark" />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

interface RegionSelection {
  state: string;
  district: string;
}

export function MapBand({
  clusters,
  regions,
  mapKey,
}: {
  clusters: ClusterCollection;
  regions: Region[];
  mapKey?: string;
}) {
  const [activeEvents, setActiveEvents] = useState<EventType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<RegionSelection | null>(null);
  const [zoomLabels, showZoomLabels] = useState(false);

  const selected = useMemo(
    () => clusters.features.find((f) => f.properties.id === selectedId) ?? null,
    [clusters, selectedId],
  );

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const handleBg = useCallback(() => setSelectedId(null), []);

  const toggleEvent = (e: EventType) =>
    setActiveEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );

  const districtOptions = useMemo(() => {
    if (!selectedDistrict) return null;
    const region = regions.find((r) => r.state === selectedDistrict.state);
    return region?.districts ?? [];
  }, [regions, selectedDistrict]);

  return (
    <section id="map" className="scroll-mt-28 bg-ink py-10 sm:py-14">
      <div className="mx-auto max-w-[1100px] px-4">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="kicker text-paper/60">The Live Map · <span lang="hi">लाइव मानचित्र</span></div>
            <h2 className="serif-display mt-1 text-2xl text-paper sm:text-3xl">
              India, reporting in real time
            </h2>
          </div>
          <p className="hidden max-w-sm text-sm text-paper/70 md:block">
            Bounded to India&apos;s full extent — {INDIA_BBOX[0]}°E to {INDIA_BBOX[2]}°E, {INDIA_BBOX[1]}°N to {INDIA_BBOX[3]}°N. Nothing outside these bounds is accepted.
          </p>
        </div>

        <div
          role="region"
          aria-label="Live weather map of India"
          tabIndex={0}
          className="relative h-[45vh] min-h-[320px] overflow-hidden rounded-2xl bg-[#FBF8F1] shadow-map ring-1 ring-white/10 md:h-[58vh] md:min-h-[430px]"
        >
          <MapCanvas
            mapId={`india-map-${mapKey ?? ""}`}
            variant="public"
            clusters={clusters}
            activeEvents={activeEvents.length ? activeEvents : null}
            selectedDistrict={selectedDistrict}
            selectedId={selectedId}
            onSelectFeature={(id) => handleSelect(id)}
            onBgClick={handleBg}
          />

          {/* event filter chips */}
          <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5 rounded-xl border border-white/10 bg-ink/70 p-1.5 text-paper backdrop-blur">
            <button
              onClick={() => setActiveEvents([])}
              aria-pressed={activeEvents.length === 0}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors motion-reduce:transition-none ${
                activeEvents.length === 0 ? "bg-white text-ink" : "text-paper/70 hover:bg-white/10 hover:text-paper"
              }`}
            >
              All events
            </button>
            {EVENT_ORDER.filter((e) =>
              clusters.features.some((f) => f.properties.event_type === e),
            ).map((e) => {
              const m = EVENT_META[e];
              const on = activeEvents.includes(e);
              return (
                <button
                  key={e}
                  onClick={() => toggleEvent(e)}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors motion-reduce:transition-none ${
                    on ? `${m.chip} bg-white/15 text-paper` : "text-paper/70 hover:bg-white/10 hover:text-paper"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* district search */}
          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
            <div className="rounded-xl border border-white/10 bg-ink/70 p-2 text-paper shadow-soft backdrop-blur">
              <select
                className="w-full bg-transparent text-sm font-medium text-paper outline-none [&>option]:text-paper [&>option]:bg-ink focus-visible:ring-2 focus-visible:ring-white/30"
                value={selectedDistrict?.state ?? ""}
                onChange={(e) => {
                  const st = e.target.value;
                  if (!st) setSelectedDistrict(null);
                  else {
                    const region = regions.find((r) => r.state === st);
                    setSelectedDistrict({ state: st, district: region?.districts[0] ?? "" });
                  }
                }}
              >
                <option value="">Track a state / district</option>
                {regions.map((r) => (
                  <option key={r.state} value={r.state}>{r.state}</option>
                ))}
              </select>
              {districtOptions && (
                <select
                  className="mt-1 w-full bg-transparent text-sm font-medium text-paper outline-none [&>option]:text-paper [&>option]:bg-ink focus-visible:ring-2 focus-visible:ring-white/30"
                  value={selectedDistrict?.district ?? ""}
                  onChange={(e) =>
                    setSelectedDistrict({ state: selectedDistrict!.state, district: e.target.value })
                  }
                >
                  {districtOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
              {selectedDistrict && (
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="mt-1 w-full rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-paper/70 transition-colors hover:bg-white/15 hover:text-paper motion-reduce:transition-none"
                >
                  Clear tracking
                </button>
              )}
            </div>
          </div>

          {/* legend */}
          <div className="absolute bottom-3 left-3 z-10 hidden flex-col gap-1.5 rounded-xl border border-white/10 bg-ink/70 px-3 py-2 text-paper/80 backdrop-blur sm:flex">
            <span className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-paper/60">
              Verified pins by type
            </span>
            {EVENT_ORDER.filter((e) =>
              clusters.features.some((f) => f.properties.event_type === e),
            ).map((e) => {
              const m = EVENT_META[e];
              const n = clusters.features.filter((f) => f.properties.event_type === e).length;
              return (
                <span key={e} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: m.mapColor }} />
                  {m.label}
                  <span className="ml-auto pl-3 font-mono tabular text-paper/60">{n}</span>
                </span>
              );
            })}
            <span className="mt-1 flex items-center gap-1.5 border-t border-white/10 pt-1.5 text-paper/60">
              <IconChevronRight width={13} height={13} />
              Click a pin for the full story
            </span>
          </div>

          {/* cluster toggle */}
          <button
            onClick={() => showZoomLabels((v) => !v)}
            className="absolute bottom-3 right-3 z-10 rounded-lg border border-white/10 bg-ink/70 px-2 py-1 text-[11px] font-medium text-paper/70 backdrop-blur transition-colors hover:text-paper motion-reduce:transition-none"
            title="Toggle cluster detail"
          >
            {zoomLabels ? "Hide labels" : "Cluster view"}
          </button>

          <SelectedStory cluster={selected} onClose={() => setSelectedId(null)} />
        </div>
        <p className="mt-2 px-1 font-mono text-[11px] text-paper/50">
          Live report locations shown in real time. State/district boundary layers sourced from the
          Census-2011 delineation; official depiction is subject to survey review by the Government of India.
        </p>
      </div>
    </section>
  );
}

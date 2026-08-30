"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  ClusterCollection,
  DeskStats,
  Report,
  ReportStatus,
} from "@/lib/types";
import { deskAction, dataMode } from "@/lib/data";
import { useDeskData } from "@/lib/useData";
import { STATUS_META } from "@/lib/eventMeta";
import { EmptyState, ErrorState, SkeletonRows, StatusPill } from "../ui";
import MapCanvas from "../map/MapCanvas";
import { QueueWire } from "./QueueWire";
import { PromoteModal } from "./PromoteModal";
import { IconArrowUpRight, IconLock, IconNewspaper } from "../icons";

const STATUSES: ReportStatus[] = [
  "pending",
  "ai_flagged",
  "auto_verified",
  "verified",
  "auto_rejected",
  "rejected",
];

function FeaturesFrom(queue: Report[], verified: ClusterCollection): ClusterCollection {
  const qFeatures = queue
    .filter((r) => r.status !== "rejected")
    .map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] as [number, number] },
      properties: r,
    }));
  return { type: "FeatureCollection", features: [...qFeatures, ...verified.features] };
}

function StatsStrip({ stats }: { stats: DeskStats | null }) {
  if (!stats) {
    return (
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {["queue", "today", "verified", "awaiting triage", "states"].map((k) => (
          <div key={k} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    );
  }
  const awaiting =
    (stats.status_breakdown.pending ?? 0) + (stats.status_breakdown.ai_flagged ?? 0);
  const grid = [
    { label: "Queue depth", value: String(stats.queue_depth), color: "#2563EB" },
    { label: "Reports today", value: String(stats.today_total), color: "#0E7FB0" },
    { label: "Verified", value: String(stats.today_verified), color: "#1E9E67" },
    { label: "Awaiting triage", value: String(awaiting), color: "#E8622C" },
    { label: "States reporting", value: String(stats.by_state.length), color: "#5A4BD1" },
  ];
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
      {grid.map((g) => (
        <div key={g.label} className="card relative overflow-hidden px-4 py-3">
          <span
            className="absolute inset-y-0 left-0 w-[3px]"
            style={{ background: g.color }}
            aria-hidden
          />
          <div className="pl-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-strong">{g.label}</div>
            <div className="serif-display tabular mt-1 text-3xl font-semibold text-ink">{g.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeskConsole() {
  const { queue, verified, stats, loadState, error, refresh, updateQueue } = useDeskData();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus[]>([]);
  const [mapEpoch, setMapEpoch] = useState(0);
  const [promoteFor, setPromoteFor] = useState<Report | null>(null);
  const wireRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const mapClusters = useMemo(() => FeaturesFrom(queue, verified), [queue, verified]);

  const selectWire = useCallback((id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      wireRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const act = useCallback(
    async (id: string, action: "approve" | "reject" | "promote", headline?: string) => {
      setBusyId(id);
      try {
        await deskAction(id, { action, headline, note: "" });
        updateQueue((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            if (action === "approve" || action === "promote")
              return {
                ...r,
                status: "verified",
                editorial_headline: headline ?? r.editorial_headline,
                audit_reason: headline ? `promoted by desk · ${headline}` : "verified by desk · corroborated",
                trust_score: action === "promote" ? Math.max(r.trust_score ?? 0, 0.8) : r.trust_score,
              };
            return { ...r, status: "rejected", audit_reason: "rejected by desk" };
          }),
        );
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [refresh, updateQueue],
  );

  const visible = useMemo(() => {
    if (statusFilter.length === 0) return queue;
    return queue.filter((r) => statusFilter.includes(r.status));
  }, [queue, statusFilter]);

  const toggleStatus = (s: ReportStatus) =>
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="flex h-1" aria-hidden>
          {["#E8622C", "#FFFFFF", "#1E9E67"].map((c, i) => (
            <span key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
              <IconNewspaper width={16} height={16} />
            </div>
            <div>
              <div className="serif-display text-lg font-bold leading-none text-ink">Desk Console</div>
              <div className="text-[11px] text-muted">
                <span lang="hi">संपादन कक्ष</span> · triage, wires & the public map
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`chip hidden sm:inline-flex ${
                dataMode === "live"
                  ? "border-green/40 bg-green/10 text-green-deep"
                  : "border-dune/40 bg-dune/10 text-dune-deep"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 animate-pulse-dot rounded-full ${
                  dataMode === "live" ? "bg-green" : "bg-dune"
                }`}
              />
              {dataMode === "live" ? (
                <span className="font-mono tabular">LIVE · polls 5s</span>
              ) : (
                <span>DEMO DATA</span>
              )}
            </span>
            <Link
              href="/"
              className="flex items-center gap-1 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-medium text-ink/70 hover:text-ink"
            >
              Public desk
              <IconArrowUpRight width={13} height={13} />
            </Link>
            <button
              onClick={() => {
                sessionStorage.removeItem("janmausam-desk-token");
                window.location.reload();
              }}
              className="flex items-center gap-1 text-xs text-muted hover:text-ink"
            >
              <IconLock width={13} height={13} />
              Lock
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <StatsStrip stats={stats} />

        {loadState === "error" && queue.length === 0 ? (
          <div className="mb-5">
            <ErrorState message={error} onRetry={() => void refresh()} />
          </div>
        ) : null}

        {loadState === "loading" && queue.length === 0 ? (
          <SkeletonRows rows={5} />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
            {loadState === "ready" && error ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-hazard/20 bg-hazard/5 px-4 py-2 text-xs lg:col-span-2">
                <span className="text-muted-strong">
                  Some feeds could not be refreshed — showing last-known data.
                </span>
                <button
                  onClick={() => void refresh()}
                  className="link-underline font-medium text-ink"
                >
                  Retry
                </button>
              </div>
            ) : null}
            {/* queue column */}
            <section>
              <div className="mb-3 flex flex-wrap items-center gap-1">
                <div className="flex flex-wrap items-stretch gap-1 p-1">
                  <button
                    onClick={() => setStatusFilter([])}
                    aria-pressed={statusFilter.length === 0}
                    className={`inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-semibold transition-colors motion-reduce:transition-none ${
                      statusFilter.length === 0
                        ? "bg-ink text-white"
                        : "bg-card text-muted-strong hover:bg-paperdeep hover:text-ink"
                    }`}
                  >
                    All
                    <span className="tabular ml-1.5 opacity-70">{queue.length}</span>
                  </button>
                  {STATUSES.map((s) => {
                    const m = STATUS_META[s];
                    const on = statusFilter.includes(s);
                    const n = queue.filter((r) => r.status === s).length;
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        aria-pressed={on}
                        className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors motion-reduce:transition-none ${
                          on
                            ? `${m.chip} border-transparent bg-paperdeep`
                            : "border-line bg-card text-muted-strong hover:bg-paperdeep hover:text-ink"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
                        {m.label}
                        <span className="font-mono tabular opacity-70">({n})</span>
                      </button>
                    );
                  })}
                </div>
                <span className="ml-auto font-mono text-[11px] tabular text-muted-strong">
                  {visible.length} wires
                </span>
              </div>

              <div className="space-y-3">
                {visible.length === 0 ? (
                  <EmptyState title="Queue is clear" body="No wires match this filter. Try another status." />
                ) : (
                  visible.map((r) => (
                    <div key={r.id} ref={(el) => { wireRefs.current[r.id] = el; }}>
                      <QueueWire
                        report={r}
                        selected={selectedId === r.id}
                        busy={busyId === r.id}
                        onSelect={() => setSelectedId(r.id)}
                        onApprove={() => act(r.id, "approve")}
                        onReject={() => act(r.id, "reject")}
                        onPromote={() => setPromoteFor(r)}
                      />
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* map column */}
            <section className="sticky top-24 self-start lg:top-24">
              <div className="kicker mb-2">Map of the desk · <span lang="hi">सभी स्थितियाँ</span></div>
              <div
                role="region"
                aria-label="Desk map of all report statuses"
                tabIndex={0}
                className="h-[300px] overflow-hidden rounded-2xl border border-line shadow-lift lg:h-[420px]"
              >
                <MapCanvas
                  mapId={`desk-map-${mapEpoch}`}
                  variant="admin"
                  clusters={mapClusters}
                  activeStatuses={statusFilter.length ? statusFilter : null}
                  selectedId={selectedId}
                  onSelectFeature={selectWire}
                  onBgClick={() => setSelectedId(null)}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted">
                <span className="flex items-center gap-1"><StatusPill status="pending" /> pending</span>
                <span className="flex items-center gap-1"><StatusPill status="ai_flagged" /> AI flagged</span>
                <span className="flex items-center gap-1"><StatusPill status="verified" /> published</span>
                <span className="ml-auto">
                  <button onClick={() => setMapEpoch((n) => n + 1)} className="link-underline text-ink">
                    reset view
                  </button>
                </span>
              </div>
            </section>
          </div>
        )}

        <PromoteModal
          open={promoteFor !== null}
          onClose={() => setPromoteFor(null)}
          onSave={(headline, note) => {
            if (promoteFor) void act(promoteFor.id, "promote", headline);
            setPromoteFor(null);
          }}
        />
      </div>
    </main>
  );
}
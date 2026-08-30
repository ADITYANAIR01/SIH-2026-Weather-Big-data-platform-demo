"use client";

import { useEffect, useRef, useState } from "react";
import type { ClusterCollection, DeskStats } from "@/lib/types";
import { EVENT_META, EVENT_ORDER } from "@/lib/eventMeta";

function Sparkline({ points }: { points: number[] }) {
  const w = 280;
  const h = 72;
  const max = Math.max(...points, 1);
  const step = w / Math.max(points.length - 1, 1);
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 4 - (v / max) * (h - 10)).toFixed(1)}`)
    .join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  const [drawn, setDrawn] = useState(false);
  const ref = useRef<SVGPathElement | null>(null);
  const lenRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      const len = el.getTotalLength();
      lenRef.current = len;
      el.style.strokeDasharray = String(len);
      // trigger draw-in next frame
      requestAnimationFrame(() => setDrawn(true));
    }
  }, [points]);

  const last = points[points.length - 1] ?? 0;
  const lx = (points.length - 1) * step;
  const ly = h - 4 - (last / max) * (h - 10);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label="Reports per hour, last N hrs"
    >
      <title>Reports per hour, last {points.length} hrs</title>
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cobalt)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--cobalt)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkArea)" />
      <path
        ref={ref}
        d={d}
        fill="none"
        stroke="var(--cobalt)"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transition: drawn ? "stroke-dashoffset 0.7s ease-out" : "none",
          strokeDashoffset: drawn ? 0 : lenRef.current,
        }}
        className="motion-reduce:transition-none"
      />
      {points.length <= 12
        ? points.map((_, i) => (
            <circle key={i} cx={i * step} cy={h - 4 - (points[i] / max) * (h - 10)} r={1} fill="var(--line)" />
          ))
        : null}
      <circle
        cx={lx}
        cy={ly}
        r={2.5}
        fill="var(--cobalt-700)"
        className="motion-safe:animate-pulse-dot"
      />
    </svg>
  );
}

export function TrendCharts({
  clusters,
  stats,
}: {
  clusters: ClusterCollection;
  stats: DeskStats | null;
}) {
  const velocity = stats?.velocity ?? [];
  const byState = stats?.by_state ?? [];
  const maxState = Math.max(...byState.map((s) => s.count), 1);

  const eventCounts = EVENT_ORDER.map((e) => ({
    ev: e,
    count: clusters.features.filter((f) => f.properties.event_type === e).length,
  })).sort((a, b) => b.count - a.count);
  const maxEv = eventCounts[0]?.count || 1;
  const activeEvents = eventCounts.filter((e) => e.count > 0).length;

  return (
    <section id="analysis" className="mx-auto max-w-6xl px-4 pb-14">
      <div className="mb-4 border-b-2 border-ink pb-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="kicker">Analysis · <span lang="hi">विश्लेषण</span></div>
            <h2 className="serif-display mt-1 text-2xl text-ink sm:text-3xl">
              The shape of the monsoon today
            </h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="kicker mb-3">Report velocity</div>
          <div className="flex items-baseline justify-between">
            <span className="serif-display tabular text-4xl font-semibold text-ink">
              {velocity.reduce((a, v) => a + v.count, 0)}
            </span>
            <span className="font-mono text-xs text-muted-strong">
              last {Math.max(velocity.length, 1)} hr{velocity.length > 2 ? "s" : ""}
            </span>
          </div>
          <div className="mt-3">
            <Sparkline points={velocity.map((v) => v.count)} />
          </div>
        </div>

        <div className="card p-5">
          <div className="kicker mb-3">Top states</div>
          <ul className="space-y-2.5">
            {byState.slice(0, 6).map((s) => (
              <li key={s.state} className="group text-sm">
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-inksoft">{s.state}</span>
                  <span className="font-mono tabular text-ink">{s.count}</span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-paperdeep"
                  role="img"
                  aria-label={`${s.state}: ${s.count} reports`}
                  title={`${s.state}: ${s.count} reports`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cobalt to-cobalt-400 transition-colors duration-150 group-hover:from-cobalt-600 group-hover:to-cobalt-700 motion-reduce:transition-none"
                    style={{ width: `${Math.round((s.count / maxState) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[11px] text-muted-strong">
            top {Math.min(byState.length, 6)} of {byState.length} states
          </p>
        </div>

        <div className="card p-5">
          <div className="kicker mb-3">Event mix · this canvas</div>
          <ul className="space-y-2.5">
            {eventCounts.map(({ ev, count }) => {
              const m = EVENT_META[ev];
              const active = count > 0;
              return (
                <li
                  key={ev}
                  className={`text-sm ${active ? "" : "opacity-45 disabled:pointer-events-none"}`}
                >
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 ${active ? "text-inksoft" : "text-muted"}`}>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: active ? m.mapColor : "var(--line)" }}
                      />
                      {m.label}
                    </span>
                    <span className="font-mono tabular text-ink">{count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-paperdeep">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: active ? `${Math.round((count / maxEv) * 100)}%` : 0,
                        background: active ? m.mapColor : "var(--line)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 font-mono text-[11px] text-muted-strong">
            9 taxonomy classes · {activeEvents} active
          </p>
        </div>
      </div>
    </section>
  );
}

"use client";

import type { KeyboardEvent } from "react";
import type { Report } from "@/lib/types";
import { EVENT_META } from "@/lib/eventMeta";
import { fmtTime, relTime } from "@/lib/format";
import { StatusPill } from "../ui";
import { WhyVerified } from "../home/WhyVerified";

export interface QueueWireProps {
  report: Report;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPromote: () => void;
}

function trustColor(score: number): string {
  if (score >= 0.66) return "#147A50";
  if (score >= 0.35) return "#B7791F";
  return "#D92D20";
}

function MiniChip({
  label,
  value,
  color,
  pct,
}: {
  label: string;
  value: string;
  color: string;
  pct?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paperdeep/60 px-2 py-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-strong">{label}</span>
      <span className="font-mono tabular text-[11px] font-medium text-ink">{value}</span>
      {pct != null ? (
        <span className="h-[3px] w-10 overflow-hidden rounded-full bg-card">
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }}
          />
        </span>
      ) : null}
    </span>
  );
}

export function QueueWire({
  report,
  selected,
  busy,
  onSelect,
  onApprove,
  onReject,
  onPromote,
}: QueueWireProps) {
  const meta = report.event_type ? EVENT_META[report.event_type] : null;
  const isResolved = report.status === "verified" || report.status === "rejected";
  const trust = report.trust_score ?? 0;
  const conf = report.pipeline?.event_conf ?? 0;

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, summary")) return;
    if (e.key === " ") e.preventDefault();
    onSelect();
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      aria-label={`Select wire ${report.id.slice(0, 8)}${report.editorial_headline ? `: ${report.editorial_headline}` : ""}`}
      className={`card relative cursor-pointer p-4 transition-shadow duration-200 motion-reduce:transition-none ${
        selected
          ? "ring-2 ring-cobalt/60 shadow-lift"
          : "hover:shadow-hover focus-visible:ring-2 focus-visible:ring-cobalt/60"
      }`}
    >
      {selected ? (
        <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-cobalt" aria-hidden />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={report.status} />
          {meta ? (
            <span className={`chip ${meta.chip}`}>
              {meta.label} · <span lang="hi">{meta.hindi}</span>
            </span>
          ) : null}
        </div>
        <span className="shrink-0 font-mono tabular text-[11px] text-muted-strong">
          {fmtTime(report.created_at)} IST
        </span>
      </div>

      <div className="mt-2">
        <p className="text-sm font-medium leading-relaxed text-ink">
          {report.editorial_headline
            ? (
              <span className="flex items-center gap-1.5">
                <span className="truncate serif-display text-[15px]">{report.editorial_headline}</span>
                <span className="chip border-saffron/40 bg-saffron/10 text-saffron-deep">promoted</span>
              </span>
            )
            : report.text}
        </p>
        <p className="mt-1 truncate text-xs text-muted-strong">{report.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-strong">
          <span className="font-medium text-ink/70">{report.state ?? "—"}</span>
          {report.district && report.district !== report.state ? <span>· {report.district}</span> : null}
          <span>· {relTime(report.created_at)}</span>
          <span>· {report.source}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <MiniChip label="trust" value={trust.toFixed(2)} color={trustColor(trust)} pct={trust} />
          <MiniChip label="conf" value={conf != null ? `${Math.round(conf * 100)}%` : "—"} color="#2563EB" pct={conf} />
          <MiniChip label="corrob" value={`${report.corroboration_count}`} color="#0E7FB0" />
        </div>
      </div>

      <details className="group mt-2" onClick={(e) => e.stopPropagation()}>
        <summary className="cursor-pointer select-none text-xs font-semibold text-cobalt transition-colors hover:text-cobalt-700 motion-reduce:transition-none">
          Desk filing & reasoning
        </summary>
        <div className="mt-2">
          <WhyVerified report={report} />
        </div>
      </details>

      {!isResolved && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onApprove} disabled={busy} className="btn !min-h-[32px] bg-green text-white hover:bg-green-deep !px-3 !py-1.5 text-xs">
            {busy ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            ) : null}
            {busy ? "Working…" : "Approve"}
          </button>
          <button onClick={onReject} disabled={busy} className="btn !min-h-[32px] !border-hazard/40 !px-3 !py-1.5 !text-xs !text-hazard hover:!bg-hazard/5 disabled:!opacity-60">
            Reject
          </button>
          <button onClick={onPromote} disabled={busy} className="btn-secondary !min-h-[32px] !px-3 !py-1.5 text-xs">
            Promote story
          </button>
          <span className="ml-auto font-mono tabular text-[11px] text-muted-strong">{report.id.slice(0, 8)}</span>
        </div>
      )}
    </article>
  );
}

"use client";

import type { ClusterProps } from "@/lib/types";
import { pct } from "@/lib/format";
import { IconShield } from "../icons";

function Row({
  label,
  value,
  note,
  variant,
}: {
  label: string;
  value: string;
  note?: string;
  variant: "light" | "dark";
}) {
  const dark = variant === "dark";
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-[12px]">
      <span className={dark ? "text-paper/60" : "text-muted-strong"}>{label}</span>
      <span className={`text-right font-mono tabular font-medium ${dark ? "text-paper/90" : "text-ink"}`}>
        {value}
        {note ? <span className={`ml-1 ${dark ? "text-paper/50" : "text-muted"}`}>{note}</span> : null}
      </span>
    </div>
  );
}

function trustBarColor(score: number): string {
  if (score >= 0.66) return "#147A50"; // green-deep
  if (score >= 0.35) return "#B7791F"; // amber
  return "#D92D20"; // red
}

export function WhyVerified({
  report,
  variant = "light",
}: {
  report: ClusterProps;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";
  const conf = report.pipeline?.event_conf ?? 0;
  const corrob = report.pipeline?.corroboration_count ?? report.corroboration_count;
  const rawScore =
    report.trust_score != null
      ? report.trust_score
      : 0.55 * Math.min(corrob, 2) / 2 + 0.45 * conf;
  const corrFactor = Math.min(corrob, 2) / 2;

  return (
    <div
      className={`rounded-lg border p-3 ${
        dark ? "border-white/15 bg-white/5" : "border-cobalt/20 bg-cobalt-50/60"
      }`}
    >
      <div
        className={`mb-2 flex items-center gap-2 text-xs font-semibold ${
          dark ? "text-paper/85" : "text-cobalt-700"
        }`}
      >
        <IconShield width={14} height={14} />
        Desk filing — why is this verified?
      </div>

      {/* trust-score bar */}
      <div className="mb-3">
        <div className={`mb-1 flex items-center justify-between text-[11px] ${dark ? "text-paper/70" : "text-muted-strong"}`}>
          <span>Trust score</span>
          <span className="font-mono tabular">{rawScore.toFixed(3)}</span>
        </div>
        <div className={`h-1 overflow-hidden rounded-full ${dark ? "bg-white/15" : "bg-cobalt-100"}`}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(Math.max(rawScore, 0), 1) * 100}%`, background: trustBarColor(rawScore) }}
          />
        </div>
      </div>

      <div className={`divide-y ${dark ? "divide-white/10" : "divide-line"}`}>
        <Row
          variant={variant}
          label="Event classification"
          value={report.pipeline?.event_type?.replace("_", " ") ?? "unclassified"}
        />
        <Row variant={variant} label="Classifier confidence" value={pct(conf)} />
        <Row
          variant={variant}
          label="Corroborating reports"
          value={String(corrob)}
          note="· within 500 m / 10 min"
        />
        <Row
          variant={variant}
          label="Trust formula"
          value={rawScore.toFixed(3)}
          note={`· 0.55×${corrFactor.toFixed(2)} + 0.45×${conf.toFixed(2)}`}
        />
        <Row variant={variant} label="Resolution" value={`${report.state ?? "—"} / ${report.district ?? "—"}`} />
      </div>
      <p
        className={`mt-2 border-t pt-2 text-[11px] leading-relaxed ${
          dark ? "border-white/10 text-paper/50" : "border-line text-muted"
        }`}
      >
        {report.audit_reason ?? "Pipeline decision. Published only after passing corroboration thresholds."}
      </p>
    </div>
  );
}

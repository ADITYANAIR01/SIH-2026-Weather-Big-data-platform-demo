"use client";

import type { ClusterCollection, DeskStats, EventType } from "@/lib/types";
import { EVENT_META } from "@/lib/eventMeta";
import { IconShield, IconDroplets, IconClock } from "../icons";

function Stat({
  value,
  label,
  sub,
  accent,
}: {
  value: string;
  label: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col border-l border-line pl-4 first:border-l-0 first:pl-0">
      <span className={`serif-display tabular text-3xl font-semibold ${accent ?? "text-ink"}`}>
        {value}
      </span>
      <span className="mt-0.5 text-xs text-muted-strong">{label}</span>
      {sub ? (
        <span className="mt-0.5 text-[10px] text-muted" lang="hi">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

export function Lede({ clusters, stats }: { clusters: ClusterCollection; stats: DeskStats | null }) {
  const verified = clusters.features.length;
  const states = new Set(clusters.features.map((f) => f.properties.state)).size;
  const newest = clusters.features
    .map((f) => f.properties.created_at)
    .reduce((a, b) => (a > b ? a : b), "");
  const topEventCounts = new Map<string, number>();
  for (const f of clusters.features) {
    const ev = f.properties.event_type;
    if (ev) topEventCounts.set(ev, (topEventCounts.get(ev) ?? 0) + 1);
  }
  const topEvent = [...topEventCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <section id="top" className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-10 pt-8 animate-fade-in">
      <div className="max-w-3xl">
        <div className="kicker mb-3">
          India&apos;s People&apos;s Weather Desk · <span lang="hi">भारत का मौसम डेस्क</span>
        </div>
        <span className="block h-0.5 w-14 bg-saffron" aria-hidden />
        <h1 className="serif-display mt-4 text-4xl leading-tight text-ink sm:text-5xl">
          Citizens and sensors, speaking one weather language.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-inksoft sm:text-lg">
          JanMausam fuses on-the-ground reports with an AI verification desk —
          every story you see below is <strong className="text-ink">bounded to India</strong>, classed
          into the national event taxonomy, and corroborated across distance and time before it is published.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-6 sm:gap-10">
        <Stat value={String(verified)} label="Verified events on the map" sub="पुष्ट घटनाएँ" />
        <Stat value={String(states)} label="States reporting" sub="राज्य रिपोर्टिंग" />
        <Stat value={String(stats?.today_total ?? "—")} label="Reports received today" sub="आज की रिपोर्टें" />
        <Stat
          value={String(stats?.queue_depth ?? "—")}
          label="Awaiting desk triage"
          sub="डेस्क जाँच हेतु"
          accent="text-saffron-deep"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-inksoft">
        <IconShield width={14} height={14} className="text-green" />
        <span>
          Every pin is <strong className="text-green-deep">verified</strong> or{" "}
          <strong className="text-green-deep">auto-verified</strong> by corroborating reports within 500 m · 10 min.
        </span>
        {topEvent ? (
          <span className="flex items-center gap-1.5">
            <IconDroplets width={14} height={14} />
            Leading signal today:{" "}
            <strong className="text-ink">{EVENT_META[topEvent[0] as EventType].label}</strong> ({topEvent[1]})
          </span>
        ) : null}
        {newest ? (
          <span className="flex items-center gap-1.5 font-mono tabular text-[11px]">
            <IconClock width={14} height={14} />
            Last update{" "}
            {new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
              -Math.round((Date.now() - new Date(newest).getTime()) / 60_000),
              "minute",
            )}{" "}
            ago
          </span>
        ) : null}
      </div>
    </section>
  );
}
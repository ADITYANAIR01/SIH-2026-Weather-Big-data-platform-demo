"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClusterCollection } from "@/lib/types";
import { modeLabel } from "@/lib/data";
import { fmtTime, relTime } from "@/lib/format";
import { IconArrowUpRight, IconGlobe, IconReport } from "../icons";

const TRICOLOR = ["#E8622C", "#FFFFFF", "#1E9E67"];
const SECTIONS = ["map", "analysis", "live"];

function LatestFlash({ clusters }: { clusters: ClusterCollection }) {
  const items = clusters.features
    .slice()
    .sort((a, b) => b.properties.created_at.localeCompare(a.properties.created_at))
    .slice(0, 6);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);

  const cur = items[idx]?.properties;
  if (!cur) return null;
  return (
    <div className="flex min-w-0 items-center gap-2 text-[13px]">
      <span className="h-3.5 w-0.5 shrink-0 rounded-full bg-saffron" aria-hidden />
      <span className="shrink-0 rounded bg-hazard/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-hazard">
        New /
      </span>
      <span className="animate-ticker-in truncate motion-reduce:animate-none">
        {cur.editorial_headline ?? cur.text.slice(0, 78)}
      </span>
      <span className="shrink-0 font-mono text-[11px] tabular text-muted-strong">
        {fmtTime(cur.created_at)} IST · {cur.state}
      </span>
    </div>
  );
}

export function Masthead({ clusters, onReport }: { clusters: ClusterCollection; onReport: () => void }) {
  const today = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const els = SECTIONS.map((id) => document.getElementById(id)).filter(
      Boolean,
    ) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0];
        setActive(top.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="flex h-1" aria-hidden>
        {TRICOLOR.map((c, i) => (
          <span key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink shadow-soft"
            aria-hidden
          >
            <span className="font-serif text-base leading-none text-white">ज</span>
          </span>
          <span className="serif-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            JanMausam
          </span>
          <span className="hidden font-serif text-sm text-muted-strong sm:inline" lang="hi">
            जनमौसम
          </span>
        </Link>

        <div className="hidden items-center gap-3 lg:flex">
          <span className="kicker tabular">{today}</span>
          <span
            className={`chip ${
              modeLabel === "LIVE"
                ? "border-green/40 bg-green/10 text-green-deep"
                : "border-dune/40 bg-dune/10 text-dune-deep"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 animate-pulse-dot rounded-full ${
                modeLabel === "LIVE" ? "bg-green" : "bg-dune"
              }`}
            />
            {modeLabel} FEED
          </span>
        </div>
      </div>

      <nav className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 pb-2 pt-2 text-sm">
        {SECTIONS.map((s) => {
          const label =
            s === "map" ? "The Live Map" : s === "analysis" ? "Analysis" : "Desk Wires";
          return (
            <Link
              key={s}
              href={`#${s}`}
              aria-current={active === s ? "true" : undefined}
              className={`rounded-md px-2.5 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cobalt/50 ${
                active === s
                  ? "bg-ink/5 text-ink"
                  : "text-ink/70 hover:bg-paperdeep hover:text-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
        <span className="flex-1" />
        <Link
          href="/admin"
          className="btn btn-secondary !px-3 !py-1.5 text-xs ring-cobalt/40"
        >
          Desk Console
          <IconArrowUpRight width={12} height={12} />
        </Link>
        <span
          className="hidden items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] text-muted-strong sm:flex"
          aria-hidden
        >
          <IconGlobe width={12} height={12} />
          <span className="mr-0.5 inline-flex items-center gap-1">
            <span className="font-semibold text-ink">EN</span> | <span lang="hi">हिन्दी</span>
          </span>
        </span>
      </nav>

      <div className="border-t border-line bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-1.5">
          <LatestFlash clusters={clusters} />
        </div>
      </div>

      <button
        onClick={onReport}
        className="pointer-events-auto fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-map transition-all hover:scale-[1.03] hover:shadow-hover focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        <IconReport width={16} height={16} />
        Report a weather event
        {clusters.features.length > 0 ? (
          <span className="tabular ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none">
            {clusters.features.length}
          </span>
        ) : null}
      </button>
    </header>
  );
}
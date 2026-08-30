"use client";

import type { ClusterCollection } from "@/lib/types";
import { EVENT_META } from "@/lib/eventMeta";
import { fmtTime, relTime } from "@/lib/format";
import { WhyVerified } from "./WhyVerified";
import { IconChevronDown } from "../icons";

export function StoryFeed({ clusters }: { clusters: ClusterCollection }) {
  const stories = clusters.features
    .slice()
    .sort((a, b) => b.properties.created_at.localeCompare(a.properties.created_at));

  return (
    <section id="live" className="mx-auto max-w-6xl px-4 pb-20">
      <div className="mb-6 border-b-2 border-ink pb-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="serif-display text-2xl text-ink sm:text-3xl">Live dispatch from the states</h2>
          <span className="kicker tabular pb-1">{stories.length} verified wires</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {stories.map((f, i) => {
          const p = f.properties;
          const meta = p.event_type ? EVENT_META[p.event_type] : null;
          const isLead = i === 0;
          return (
            <article
              key={p.id}
              className={`overflow-hidden rounded-xl border border-line border-l-4 bg-card shadow-soft transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                isLead ? "sm:col-span-2" : ""
              }`}
              style={{ borderLeftColor: meta?.mapColor ?? "var(--line)" }}
            >
              <div className={isLead ? "p-6" : "p-5"}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {meta ? (
                    <span className={`chip ${meta.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label} · <span lang="hi">{meta.hindi}</span>
                    </span>
                  ) : null}
                  <span className="font-mono tabular text-[11px] uppercase tracking-wider text-muted-strong">
                    {p.source} · {fmtTime(p.created_at)} IST
                  </span>
                </div>

                <h3 className={`serif-display leading-snug text-ink ${isLead ? "text-xl" : "text-lg"}`}>
                  {p.editorial_headline ?? p.text.slice(0, 80)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-inksoft">{p.text}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-strong">
                  <span className="font-medium text-ink/70">{p.state}</span>
                  {p.district && p.district !== p.state ? <span>· {p.district}</span> : null}
                  <span>·</span>
                  <span>{relTime(p.created_at)}</span>
                  {p.corroboration_count > 0 ? (
                    <span>· {p.corroboration_count} corroborating reports</span>
                  ) : null}
                </div>

                <details className="group mt-3">
                  <summary className="flex cursor-pointer select-none items-center gap-1 text-xs font-semibold text-cobalt transition-colors hover:text-cobalt-700 motion-reduce:transition-none">
                    Why was this verified?
                    <IconChevronDown
                      width={12}
                      height={12}
                      className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <div className="mt-2">
                    <WhyVerified report={p} />
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

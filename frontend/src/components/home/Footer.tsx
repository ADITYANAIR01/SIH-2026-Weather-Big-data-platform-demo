import Link from "next/link";
import { IconArrowUpRight, IconCheck } from "../icons";

const TRICOLOR = ["#E8622C", "#FFFFFF", "#1E9E67"];

export function Footer() {
  return (
    <footer>
      <div className="flex h-1" aria-hidden>
        {TRICOLOR.map((c, i) => (
          <span key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="bg-paperdeep/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="serif-display text-xl font-bold text-ink">JanMausam</span>
              <span className="font-serif text-sm text-muted" lang="hi">
                जनमौसम
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-inksoft">
              The People&apos;s Weather Desk — a demo of India-centric, citizen-sourced weather
              intelligence with corroboration-based trust scoring and a human verification desk.
            </p>
          </div>

          <div>
            <div className="kicker mb-3">How trust works</div>
            <ul className="space-y-2 text-sm text-inksoft">
              <li className="flex items-start gap-2">
                <IconCheck width={15} height={15} className="mt-0.5 shrink-0 text-green" />
                Every report is checked against India&apos;s bounds before ingestion.
              </li>
              <li className="flex items-start gap-2">
                <IconCheck width={15} height={15} className="mt-0.5 shrink-0 text-green" />
                Duplicates are rejected; near-identical text + location are flagged.
              </li>
              <li className="flex items-start gap-2">
                <IconCheck width={15} height={15} className="mt-0.5 shrink-0 text-green" />
                Verified = corroborating reports within 500 m / 10 min + classifier confidence.
              </li>
            </ul>
          </div>

          <div>
            <div className="kicker mb-3">Data & boundaries</div>
            <p className="text-sm leading-relaxed text-inksoft">
              Map boundaries use the Census-2011 delineation under the current 36-state structure.
              Official depiction is subject to survey review by the Government of India. IMD remains
              the authoritative weather source.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="btn btn-secondary !px-3 !py-1.5 text-xs"
              >
                Verification desk
                <IconArrowUpRight width={12} height={12} />
              </Link>
              <a href="#map" className="btn btn-secondary !px-3 !py-1.5 text-xs">
                Back to the map
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[11px] text-muted">
            <span>IMD remains the authoritative weather source · mos outlook is illustrative</span>
            <span className="tabular">JanMausam · <span lang="hi">जनमौसम</span> · demo 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useState } from "react";
import { usePublicData } from "@/lib/useData";
import { Masthead } from "./Masthead";
import { Lede } from "./Lede";
import { MapBand } from "./MapBand";
import { TrendCharts } from "./TrendCharts";
import { StoryFeed } from "./StoryFeed";
import { Footer } from "./Footer";
import { ReportModal } from "./ReportModal";
import { ErrorState, Spinner } from "../ui";

export function HomeView() {
  const { clusters, stats, regions, loadState, error, refresh } = usePublicData();
  const [reportOpen, setReportOpen] = useState(false);

  if (loadState === "loading" && clusters.features.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <Spinner label="Opening the desk…" />
      </main>
    );
  }

  if (loadState === "error" && clusters.features.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-4">
        <ErrorState message={error} onRetry={() => void refresh()} />
      </main>
    );
  }

  return (
    <main>
      {loadState === "ready" && error ? (
        <div className="border-b border-hazard/20 bg-hazard/5">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs text-ink">
            <span className="text-muted-strong">
              Live feed paused — recent report data could not be refreshed.
            </span>
            <button
              onClick={() => void refresh()}
              className="link-underline font-medium text-ink"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}
      <Masthead clusters={clusters} onReport={() => setReportOpen(true)} />
      <Lede clusters={clusters} stats={stats} />
      <MapBand clusters={clusters} regions={regions} />
      <TrendCharts clusters={clusters} stats={stats} />
      <StoryFeed clusters={clusters} />
      <Footer />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </main>
  );
}
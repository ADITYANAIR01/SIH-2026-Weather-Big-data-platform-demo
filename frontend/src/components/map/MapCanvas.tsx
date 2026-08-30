"use client";

import dynamic from "next/dynamic";
import type { IndiaMapProps } from "./IndiaMap";
import { IndiaSilhouette } from "../icons";

function MapSkeleton() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-paper">
      <div className="skeleton flex items-center justify-center rounded-xl px-6 py-4 text-ink/40">
        <IndiaSilhouette title="Loading the live map…" />
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-strong">
        Loading the live map…
      </p>
    </div>
  );
}

const IndiaMap = dynamic(() => import("./IndiaMap").then((m) => m.IndiaMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function MapCanvas(props: IndiaMapProps) {
  return <IndiaMap {...props} />;
}

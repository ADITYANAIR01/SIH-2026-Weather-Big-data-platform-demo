import type { ReportStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/eventMeta";
import { IconCheck, IconShield } from "./icons";

export function StatusPill({ status }: { status: ReportStatus }) {
  const m = STATUS_META[status];
  const pulsing = status === "pending" ? "animate-pulse-dot" : "";
  return (
    <span title={m.hindi} className={`chip ${m.chip}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${pulsing}`}
        style={{ background: m.color }}
      />
      {m.label}
    </span>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="kicker">{children}</div>;
}

export function SectionTitle({
  kicker,
  title,
  hint,
}: {
  kicker: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <Kicker>{kicker}</Kicker>
        <h2 className="serif-display mt-1 text-2xl text-ink sm:text-3xl">{title}</h2>
      </div>
      {hint ? <p className="hidden pb-1 text-sm text-muted-strong sm:block">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-strong" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-cobalt" />
      {label ?? "Loading…"}
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-11" />
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "h-20" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function EmptyState({
  title,
  body,
  icon = "shield",
}: {
  title: string;
  body: string;
  icon?: "shield" | "check";
}) {
  const Icon = icon === "check" ? IconCheck : IconShield;
  const tone = icon === "check" ? "text-green" : "text-muted-strong";
  return (
    <div className="flex animate-fade-in flex-col items-center gap-2 py-10 text-center">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          icon === "check"
            ? "bg-green/10 ring-2 ring-green/20"
            : "bg-paperdeep"
        }`}
      >
        <Icon width={18} height={18} className={tone} />
      </span>
      <p className="serif-display text-lg text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted-strong">{body}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-hazard/25 bg-hazard/5 px-6 py-8 text-center"
    >
      <p className="serif-display text-lg text-ink">
        The desk is temporarily unreachable
      </p>
      <p className="max-w-md text-sm text-muted-strong">
        {message ?? "We could not load the latest reports. Try again — the rest of the desk is still live."}
      </p>
      <button onClick={onRetry} className="btn btn-secondary">
        Retry
      </button>
    </div>
  );
}
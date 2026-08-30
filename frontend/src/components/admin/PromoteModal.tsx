"use client";

import { useEffect, useRef, useState } from "react";
import { IconX } from "../icons";

const MAX_LEN = 72;
const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function PromoteModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (headline: string, note: string) => void;
}) {
  const [headline, setHeadline] = useState("");
  const [note, setNote] = useState("");

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (triggerRef.current) {
      triggerRef.current.focus?.();
      triggerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const nodes = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((n) => !n.hasAttribute("disabled"));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === dialogRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // reset draft when opened
  useEffect(() => {
    if (open) setHeadline("");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-card shadow-lift"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promote-modal-title"
      >
        {/* saffron header rule */}
        <div className="h-1 w-full bg-saffron" aria-hidden />

        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="kicker mb-1">Desk promotion</div>
              <h2 id="promote-modal-title" className="serif-display text-xl text-ink">
                Write the wire headline
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-paperdeep hover:text-ink motion-reduce:transition-none"
              aria-label="Close promotion dialog"
            >
              <IconX width={18} height={18} />
            </button>
          </div>

          <label htmlFor="promote-headline" className="mb-1 block text-xs font-semibold text-ink/70">
            Headline (shown on the public map)
          </label>
          <input
            ref={inputRef}
            id="promote-headline"
            className="input"
            placeholder="e.g. High tide flooding towers over Mumbai's western suburbs"
            maxLength={MAX_LEN}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />

          {/* live headline preview strip */}
          <div className="mt-3 rounded-lg border border-cobalt/10 bg-cobalt-50/50 p-3">
            <p className="serif-display text-lg leading-snug text-ink">
              {headline.trim() || <span className="text-muted">Headline preview…</span>}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-muted-strong">Public preview</span>
              <span className={`font-mono tabular text-[11px] ${headline.length > MAX_LEN - 8 ? "text-hazard" : "text-muted-strong"}`}>
                {headline.length}/{MAX_LEN}
              </span>
            </div>
          </div>

          <label htmlFor="promote-note" className="mb-1 mt-4 block text-xs font-semibold text-ink/70">
            Editor&apos;s note <span className="font-normal text-muted">(public)</span>
          </label>
          <textarea
            id="promote-note"
            className="input min-h-[72px] resize-y"
            placeholder="One line of context for readers…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button
            onClick={() => onSave(headline.trim(), note.trim())}
            disabled={!headline.trim()}
            className="btn-primary mt-5 w-full"
          >
            Promote & approve
          </button>
        </div>
      </div>
    </div>
  );
}

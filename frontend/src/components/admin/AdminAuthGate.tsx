"use client";

import { useRef, useState } from "react";
import { IconLock, IndiaSilhouette } from "../icons";

const TOKEN_KEY = "janmausam-desk-token";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string>(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem(TOKEN_KEY) ?? "") : "",
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    if (!draft.trim()) {
      setError("Enter the desk access code.");
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, draft.trim());
    setToken(draft.trim());
    setError(null);
  };

  if (!token) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paperdeep px-4">
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-ink"
          aria-hidden
          style={{ opacity: 0.04 }}
        >
          <IndiaSilhouette className="h-[80vh] w-auto" />
        </div>
        <div className="relative w-full max-w-sm animate-card-in rounded-2xl border border-line bg-card p-8 shadow-lift motion-reduce:animate-none">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cobalt text-white shadow-soft">
            <IconLock />
          </div>
          <h1 className="serif-display text-2xl text-ink">Desk Console</h1>
          <p className="mt-1 font-serif italic text-muted-strong" lang="hi">
            संपादन कक्ष · restricted to desk officers
          </p>
          <input
            ref={inputRef}
            className="input mt-5 font-mono"
            type="password"
            placeholder="Desk access code"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error ? <p role="alert" className="mt-2 text-xs text-hazard">{error}</p> : null}
          <button onClick={submit} className="btn-primary mt-4 w-full">
            Enter the desk
          </button>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            Demo access code is shared with the deployment. The token lives only in this
            browser session.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

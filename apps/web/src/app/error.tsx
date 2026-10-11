"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Kept to console.error so the failure is visible in the server log without
    // shipping an error-reporting dependency to the browser.
    console.error("[nooreign] unhandled route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-20">
      <p className="eyebrow">The court adjourned</p>
      <h1 className="serif text-4xl leading-tight text-parchment">Something broke while tabulating the verdict</h1>
      <p className="text-lg leading-relaxed text-parchment-dim">
        An unexpected error interrupted this page. The atlas itself is deterministic, so this is a bug
        rather than a moral uncertainty — try again, and if it persists it is worth an issue.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-parchment-dim/70">digest: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-realm bg-gold px-5 py-2.5 font-mono text-sm text-ink"
        >
          Try again
        </button>
        <Link href="/" className="rounded-realm border border-abyss-border px-5 py-2.5 font-mono text-sm text-parchment hover:border-gold hover:text-gold">
          Back to the atlas
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { GLOSSARY, TEXTS } from "@repo/seed";
import { CodexBrowser } from "@/components/codex/codex-browser";

export const metadata: Metadata = {
  title: "Codex",
  description:
    "A hundred and twenty alignment, ethics, philosophy and governance terms defined without hand-waving, plus the canon texts the twelve kingdoms stand on.",
};

export default function CodexPage() {
  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">Codex</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">Every term, defined without hand-waving</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Alignment writing has a vocabulary problem: the terms are precise inside a small community and
          mushy everywhere else. These definitions say what a term means, which realm it came from, and
          — where it is worth saying — what it does not settle.
        </p>
      </header>

      <CodexBrowser glossary={GLOSSARY} texts={TEXTS} />
    </div>
  );
}

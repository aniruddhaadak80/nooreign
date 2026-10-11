import type { Metadata } from "next";
import { KINGDOMS } from "@repo/seed";
import { KingdomGrid } from "@/components/atlas/kingdom-grid";

export const metadata: Metadata = {
  title: "The Kingdoms",
  description:
    "Twelve schools of thought as realms: Stoicism, Kantian deontology, utilitarianism, virtue ethics, Buddhism, Confucianism, Ubuntu, contractualism, care ethics, existentialism, pragmatism and longtermism — each with its stance on superintelligence.",
};

export default function KingdomsPage() {
  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">Atlas · realms</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">The twelve kingdoms</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Each realm is a way of counting — six axes, six numbers, one court. The terrain and the crest
          are decoration; what the deliberation engine reads is the axiom weighting, and that is why two
          courts can look at the same dilemma and disagree for a reason you can point at.
        </p>
        <p className="mt-4 text-base leading-relaxed text-parchment-dim/90">
          Six axes are a compression, not a discovery. No tradition agrees on what to do with the
          leftovers, and the territories that get squashed are where the interesting arguments live.
        </p>
      </header>
      <KingdomGrid kingdoms={KINGDOMS} />
    </div>
  );
}

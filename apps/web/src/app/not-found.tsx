import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-20">
      <p className="eyebrow">404 · unmapped territory</p>
      <h1 className="serif text-4xl leading-tight text-parchment">There is no realm at that address</h1>
      <p className="text-lg leading-relaxed text-parchment-dim">
        Either the page has moved, or you have followed a link into territory this atlas has not charted.
        The Twelve Kingdoms, the Court, the Chronicle and the Observatory are all one click away.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/kingdoms" className="rounded-realm bg-gold px-5 py-2.5 font-mono text-sm text-ink">
          The kingdoms
        </Link>
        <Link href="/council" className="rounded-realm border border-abyss-border px-5 py-2.5 font-mono text-sm text-parchment hover:border-gold hover:text-gold">
          Convene a council
        </Link>
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          Back to the atlas
        </Link>
      </div>
    </div>
  );
}

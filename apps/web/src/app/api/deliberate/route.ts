import { NextResponse } from "next/server";
import { convene, conveneRequestSchema } from "@/lib/convene";

/**
 * POST /api/deliberate — run a court headlessly.
 *
 * The same function backs the server-rendered council page, so this endpoint is a
 * transport, not a second engine. It is deliberately unauthenticated and side-effect
 * free: it computes and returns, it stores nothing.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "request body must be JSON" }, { status: 400 });
  }

  const parsed = conveneRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") },
      { status: 422 },
    );
  }

  const result = convene(parsed.data);
  if ("error" in result) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    method: "POST",
    description: "Convene a court on a dilemma and return the verdict with the full reasoning trace.",
    body: {
      dilemmaId: "string — a dilemma id or slug from packages/seed",
      advisorIds: "string[] — 1..12 advisor ids or slugs",
      seed: "number — optional, 0..1000000, defaults to the repository seed 2406",
    },
    deterministic: true,
    example: {
      dilemmaId: "d01",
      advisorIds: ["kant", "bentham", "bostrom", "held"],
      seed: 2406,
    },
  });
}

import { NextResponse } from "next/server";
import { stressFor, stressRequestSchema } from "@/lib/resilience";

/**
 * POST /api/resilience — sweep a case across consecutive seeds and thin its bench.
 *
 * The same function backs the resilience pages, so this endpoint is a
 * transport, not a second analysis. It is deliberately unauthenticated and
 * side-effect free: it computes and returns, it stores nothing.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "request body must be JSON" }, { status: 400 });
  }

  const parsed = stressRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") },
      { status: 422 },
    );
  }

  const { dilemmaId, advisorIds, seed, count } = parsed.data;
  const result = stressFor(dilemmaId, {
    seed,
    count,
    ...(advisorIds !== undefined ? { advisorIds } : {}),
  });
  if (!result) return NextResponse.json({ error: `unknown dilemma "${dilemmaId}"` }, { status: 404 });
  return NextResponse.json(result);
}

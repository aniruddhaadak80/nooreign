import { NextResponse } from "next/server";
import { runSweep, sweepRequestSchema, type SweepRequest } from "@/lib/sweeps";

/**
 * POST /api/experiment — sweep one parameter of a thought experiment.
 * GET documents the contract so the endpoint is discoverable without the docs site.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "request body must be JSON" }, { status: 400 });
  }

  const parsed = sweepRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") },
      { status: 422 },
    );
  }

  const result = runSweep(parsed.data as SweepRequest);
  if ("error" in result) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    method: "POST",
    description: "Sweep one parameter of a thought experiment and return the metric rows.",
    body: {
      experimentId: "string — an experiment id or slug",
      key: "string — the parameter to sweep along the x axis",
      overrides: "Record<string, number> — fixed values for the remaining parameters",
      seed: "number — optional",
      steps: "number — 5..60, default 24",
    },
    example: { experimentId: "x01-paperclip-sweep", key: "capability", overrides: {}, steps: 24 },
    deterministic: true,
  });
}

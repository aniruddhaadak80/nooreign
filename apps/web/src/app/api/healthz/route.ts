import { ATLAS_STATS, SEED } from "@repo/seed";

/** Liveness + a manifest of what is actually loaded, for the Docker healthcheck. */
export function GET() {
  return Response.json({
    status: "ok",
    service: "nooreign-web",
    seed: SEED,
    deterministic: true,
    datasets: ATLAS_STATS,
    timestamp: new Date().toISOString(),
  });
}

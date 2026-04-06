import { NextRequest, NextResponse } from "next/server";

/**
 * Weekly review refresh cron endpoint.
 * Scrapes new reviews for all active hotels and runs incremental pipeline.
 * Returns immediately — work runs in the background (fire-and-forget).
 *
 * Protected by CRON_SECRET bearer token.
 * Trigger weekly via AWS EventBridge, CloudWatch, or:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/weekly-refresh
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fire-and-forget — return immediately, work runs in background
  import("@/lib/scheduler")
    .then(({ runWeeklyRefresh }) => runWeeklyRefresh())
    .then((results) => {
      const inserted = results.reduce((s, r) => s + r.totalInserted, 0);
      const succeeded = results.filter(r => r.pipelineStatus === "completed").length;
      console.log(`[cron/weekly-refresh] Done: ${results.length} hotels, ${inserted} new reviews, ${succeeded} pipelines completed`);
    })
    .catch((err) => {
      console.error("[cron/weekly-refresh] Failed:", err);
    });

  return NextResponse.json({
    status: "started",
    message: "Weekly refresh triggered — running in background. Check server logs for results.",
  });
}

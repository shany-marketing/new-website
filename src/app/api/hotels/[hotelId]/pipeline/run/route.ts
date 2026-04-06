import { NextRequest, NextResponse } from "next/server";
import { runFullPipeline, getPipelineStatus, hasPendingWork } from "@/lib/pipeline";
import { requireHotelAccess, requireAdmin } from "@/lib/auth";
import { checkFeatureAccess } from "@/lib/plan";
import { queryOne } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    // Admins can force re-run even if no new reviews
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    let isAdmin = false;
    if (force) {
      const adminResult = await requireAdmin();
      if (adminResult.error) return adminResult.error;
      isAdmin = true;
    }

    if (!isAdmin && !(await checkFeatureAccess(hotelId, "pipeline"))) {
      return NextResponse.json(
        { error: "Full pipeline requires the Analytics add-on" },
        { status: 403 }
      );
    }

    // Check if the hotel has any reviews to process
    const reviewCount = await queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM raw_reviews WHERE hotel_id = $1",
      [hotelId]
    );
    if (!reviewCount || parseInt(reviewCount.count) === 0) {
      return NextResponse.json(
        { error: "No reviews to process. Ingest reviews before running the pipeline." },
        { status: 400 }
      );
    }

    // Check if there's already a running pipeline
    const current = await getPipelineStatus(hotelId);
    if (current && current.status === "running") {
      return NextResponse.json(
        { error: "A pipeline is already running", runId: current.runId },
        { status: 409 }
      );
    }

    // Check if there are new un-decomposed reviews (otherwise pipeline would give same results)
    if (!force && !(await hasPendingWork(hotelId))) {
      return NextResponse.json(
        { error: "No new reviews to process. Pipeline would produce the same results." },
        { status: 400 }
      );
    }

    // Create the pipeline run record immediately
    const run = await queryOne<{ id: string; started_at: string }>(
      `INSERT INTO pipeline_runs (hotel_id, status, current_stage)
       VALUES ($1, 'running', 'baseline_stats')
       RETURNING id, started_at::text`,
      [hotelId]
    );

    if (!run) {
      return NextResponse.json({ error: "Failed to create pipeline run" }, { status: 500 });
    }

    // Fire-and-forget: run the pipeline in background
    // The client polls /pipeline/status to track progress
    runFullPipeline(hotelId, run.id).catch((err) => {
      console.error(`Background pipeline failed for hotel ${hotelId}:`, err);
    });

    return NextResponse.json({
      runId: run.id,
      status: "running",
      currentStage: "baseline_stats",
      startedAt: run.started_at,
    });
  } catch (error) {
    console.error("Pipeline run error:", error);
    return NextResponse.json(
      { error: "Failed to start pipeline" },
      { status: 500 }
    );
  }
}

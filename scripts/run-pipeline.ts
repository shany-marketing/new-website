import { queryOne } from "@/lib/db";
import { runFullPipeline } from "@/lib/pipeline";

async function main() {
  const hotelId = "d716b6ab-e03f-40ae-ad2f-9c9886ba3038";

  const run = await queryOne<{ id: string; started_at: string }>(
    `INSERT INTO pipeline_runs (hotel_id, status, current_stage)
     VALUES ($1, 'running', 'baseline_stats')
     RETURNING id, started_at::text`,
    [hotelId]
  );

  if (!run) {
    console.error("Failed to create pipeline run");
    process.exit(1);
  }

  console.log("Pipeline run created:", run.id);
  await runFullPipeline(hotelId, run.id);
  console.log("Pipeline completed!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

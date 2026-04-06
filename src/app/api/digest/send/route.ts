import { NextRequest, NextResponse } from "next/server";
import { processAllDigests } from "@/lib/email-digest";

/**
 * Cron endpoint to send all pending email digests.
 * Protected by DIGEST_CRON_SECRET header (machine-to-machine auth).
 * Called by AWS EventBridge or similar scheduler.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.DIGEST_CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processAllDigests();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Digest cron error:", error);
    return NextResponse.json({ error: "Failed to process digests" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { triggerApifyScrape, waitForScrapeAndIngest } from "@/lib/scrape";
import { cleanPlatformUrl } from "@/types/platform";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const hotels = await query<{
    id: string;
    name: string;
    plan: string;
    booking_url: string | null;
    review_count: string;
    user_count: string;
    created_at: string;
  }>(
    `SELECT h.id, h.name, h.plan, h.booking_url,
            COUNT(DISTINCT rr.id)::text AS review_count,
            COUNT(DISTINCT u.id)::text AS user_count,
            h.created_at::text
     FROM hotels h
     LEFT JOIN raw_reviews rr ON rr.hotel_id = h.id
     LEFT JOIN users u ON u.hotel_id = h.id
     GROUP BY h.id
     ORDER BY h.created_at DESC`
  );

  return NextResponse.json(hotels);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, bookingUrl } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Hotel name is required" }, { status: 400 });
  }

  const cleanBooking = bookingUrl?.trim() ? cleanPlatformUrl(bookingUrl) : null;

  // Check for duplicate booking URL
  if (cleanBooking) {
    const existing = await queryOne<{ id: string; name: string }>(
      "SELECT id, name FROM hotels WHERE booking_url = $1",
      [cleanBooking]
    );
    if (existing) {
      return NextResponse.json(
        { error: `A hotel with this Booking.com URL already exists: ${existing.name}` },
        { status: 409 }
      );
    }
  }

  const hotel = await queryOne<{ id: string; name: string }>(
    `INSERT INTO hotels (name, booking_url) VALUES ($1, $2) RETURNING id, name`,
    [name, cleanBooking]
  );

  // Auto-trigger Apify scrape if booking URL provided
  let scrapeStarted = false;
  if (cleanBooking) {
    try {
      const { runId, datasetId } = await triggerApifyScrape(cleanBooking);
      waitForScrapeAndIngest(hotel!.id, runId, datasetId).catch((err) => {
        console.error(`Admin scrape failed for hotel ${hotel!.id}:`, err);
      });
      scrapeStarted = true;
    } catch (err) {
      console.error("Admin scrape trigger failed:", err);
    }
  }

  return NextResponse.json({ ...hotel, scrapeStarted });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { hotelId } = await req.json();
  if (!hotelId) {
    return NextResponse.json({ error: "hotelId is required" }, { status: 400 });
  }

  // Cascade delete: mappings, items, reviews, stats, pipeline runs, etc.
  await query("DELETE FROM category_mappings WHERE hotel_id = $1", [hotelId]);
  await query("DELETE FROM category_stats WHERE hotel_id = $1", [hotelId]);
  await query("DELETE FROM staff_actions WHERE hotel_id = $1", [hotelId]);
  await query("DELETE FROM ai_cost_log WHERE hotel_id = $1", [hotelId]);
  await query("DELETE FROM chain_hotel_access WHERE hotel_id = $1", [hotelId]);
  await query("DELETE FROM pipeline_runs WHERE hotel_id = $1", [hotelId]);
  await query("DELETE FROM atomic_items WHERE hotel_id = $1", [hotelId]);
  await query("DELETE FROM raw_reviews WHERE hotel_id = $1", [hotelId]);
  await query("DELETE FROM consensus_categories WHERE hotel_id = $1", [hotelId]);
  await query("UPDATE users SET hotel_id = NULL WHERE hotel_id = $1", [hotelId]);

  const deleted = await queryOne<{ id: string }>(
    "DELETE FROM hotels WHERE id = $1 RETURNING id",
    [hotelId]
  );

  if (!deleted) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

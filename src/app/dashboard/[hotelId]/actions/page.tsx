import { query, queryOne } from "@/lib/db";
import { checkFeatureAccess } from "@/lib/plan";
import UpgradeBanner from "@/components/ui/upgrade-banner";
import ActionsClient from "./actions-client";

interface Props {
  params: Promise<{ hotelId: string }>;
}

export default async function ActionsPage({ params }: Props) {
  const { hotelId } = await params;

  if (!(await checkFeatureAccess(hotelId, "staff_actions"))) {
    return (
      <div className="py-12">
        <UpgradeBanner feature="Staff Actions Management — Included in the Insight tier ($999/mo)" />
      </div>
    );
  }

  let hotelName = "Hotel";
  let categories: Array<{ id: string; label: string; sentiment: string }> = [];

  try {
    const hotel = await queryOne<{ name: string }>(
      "SELECT name FROM hotels WHERE id = $1",
      [hotelId]
    );
    if (hotel) hotelName = hotel.name;

    categories = await query<{ id: string; label: string; sentiment: string }>(
      `SELECT id::text, label, sentiment
       FROM consensus_categories
       WHERE hotel_id = $1
       ORDER BY label`,
      [hotelId]
    );
  } catch {
    // DB not available
  }

  return (
    <ActionsClient
      hotelId={hotelId}
      hotelName={hotelName}
      categories={categories}
    />
  );
}

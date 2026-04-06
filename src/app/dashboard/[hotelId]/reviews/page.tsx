import { queryOne } from "@/lib/db";
import { checkFeatureAccess } from "@/lib/plan";
import ReviewsClient from "./reviews-client";

interface Props {
  params: Promise<{ hotelId: string }>;
}

export default async function ReviewsPage({ params }: Props) {
  const { hotelId } = await params;

  let hotelName = "Hotel";
  let accessLevel: "demo" | "full" = "demo";

  try {
    const hotel = await queryOne<{ name: string }>(
      "SELECT name FROM hotels WHERE id = $1",
      [hotelId]
    );
    if (hotel) hotelName = hotel.name;

    const hasFullAccess = await checkFeatureAccess(hotelId, "reviews_full");
    accessLevel = hasFullAccess ? "full" : "demo";
  } catch {
    // DB not available
  }

  return <ReviewsClient hotelId={hotelId} hotelName={hotelName} accessLevel={accessLevel} />;
}

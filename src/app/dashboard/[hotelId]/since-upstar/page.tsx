import { queryOne } from "@/lib/db";
import { computeSinceUpstar } from "@/lib/since-upstar";
import SinceUpstarClient from "./since-upstar-client";
import UpgradeBanner from "@/components/ui/upgrade-banner";
import { checkFeatureAccess } from "@/lib/plan";

interface Props {
  params: Promise<{ hotelId: string }>;
}

export default async function SinceUpstarPage({ params }: Props) {
  const { hotelId } = await params;

  if (!(await checkFeatureAccess(hotelId, "since_upstar"))) {
    return <UpgradeBanner feature="Since UpStar" />;
  }

  let hotelName = "Hotel";
  let data = null;

  try {
    const hotel = await queryOne<{ name: string }>(
      "SELECT name FROM hotels WHERE id = $1",
      [hotelId]
    );
    if (hotel) hotelName = hotel.name;

    data = await computeSinceUpstar(hotelId);
  } catch {
    // DB not available
  }

  return <SinceUpstarClient hotelName={hotelName} data={data} />;
}

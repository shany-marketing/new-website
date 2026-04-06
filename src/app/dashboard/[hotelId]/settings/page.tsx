import { queryOne } from "@/lib/db";
import SettingsClient from "./settings-client";

interface Props {
  params: Promise<{ hotelId: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { hotelId } = await params;

  let hotelName = "Hotel";
  let urls = {
    bookingUrl: null as string | null,
    googleUrl: null as string | null,
    expediaUrl: null as string | null,
    tripadvisorUrl: null as string | null,
  };

  try {
    const hotel = await queryOne<{
      name: string;
      booking_url: string | null;
      google_url: string | null;
      expedia_url: string | null;
      tripadvisor_url: string | null;
    }>(
      "SELECT name, booking_url, google_url, expedia_url, tripadvisor_url FROM hotels WHERE id = $1",
      [hotelId]
    );
    if (hotel) {
      hotelName = hotel.name;
      urls = {
        bookingUrl: hotel.booking_url,
        googleUrl: hotel.google_url,
        expediaUrl: hotel.expedia_url,
        tripadvisorUrl: hotel.tripadvisor_url,
      };
    }
  } catch {
    // DB not available
  }

  return <SettingsClient hotelId={hotelId} hotelName={hotelName} initialUrls={urls} />;
}

import { queryOne } from "@/lib/db";
import BenchmarkClient from "./benchmark-client";

interface Props {
  params: Promise<{ hotelId: string }>;
}

export default async function BenchmarkPage({ params }: Props) {
  const { hotelId } = await params;

  let hotelName = "Hotel";
  try {
    const hotel = await queryOne<{ name: string }>(
      "SELECT name FROM hotels WHERE id = $1",
      [hotelId]
    );
    if (hotel) hotelName = hotel.name;
  } catch {
    // DB not available
  }

  return <BenchmarkClient hotelId={hotelId} hotelName={hotelName} />;
}

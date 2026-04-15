import type { Metadata } from "next";
import RatingsClient from "./ratings-client";

export const metadata: Metadata = {
  title: "Ratings | RatingIQ",
  description: "Track your hotel chain's Booking.com score and ratings across every platform, every month, every segment. Understand exactly where your score is and where it's headed.",
};

export default function RatingsPage() {
  return <RatingsClient />;
}

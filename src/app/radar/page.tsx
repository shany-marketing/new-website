import type { Metadata } from "next";
import RatingsClient from "../capabilities/ratings/ratings-client";

export const metadata: Metadata = {
  title: "Radar | RatingIQ",
  description: "Track your hotel chain's rating across every platform, every month, every segment. Understand exactly where your score is and where it's headed.",
};

export default function RadarPage() {
  return <RatingsClient />;
}
